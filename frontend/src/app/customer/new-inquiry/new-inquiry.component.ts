/**
 * How the conversation actually works, since it's the most involved
 * piece of logic in the whole frontend:
 *
 * 1. Every message the customer sends gets run through the NER model
 *    independently (POST /ner/extract) - the model was trained on
 *    single self-contained sentences, not multi-turn dialogue, so we
 *    don't send it the whole conversation history, just the new text.
 * 2. Whatever fields that message's extraction found get MERGED into
 *    `specification`, a running object that only ever grows/updates -
 *    it's never reset between messages. This is what lets someone
 *    describe their job over several short messages instead of one
 *    perfect paragraph.
 * 3. After merging, we check the same required-fields list the
 *    backend's missing_field_service.py uses (kept in sync manually -
 *    see the comment on REQUIRED_FIELDS below) and ask about the
 *    first one still missing.
 * 4. Once nothing required is missing, we call the price model and
 *    move to the review step, where every field is directly editable
 *    before submitting - satisfying the proposal's requirement that
 *    the customer can review and correct what the AI extracted.
 */

import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

import { InquiryService } from '../../core/services/inquiry.service';
import { CategoryService } from '../../core/services/category.service';
import { PrintCategory } from '../../core/models/category.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

// Mirrors app/services/missing_field_service.py on the backend. Kept
// as a separate list here (rather than fetched from the API) since
// it's simple, static, and this way the conversation can decide its
// next question instantly without a network round trip.
const REQUIRED_FIELDS: { key: string; question: string }[] = [
  { key: 'category', question: 'What would you like to print (e.g. business cards, flyers, banners)?' },
  { key: 'quantity', question: 'How many copies do you need?' },
  { key: 'paper_type', question: 'What type of paper would you like?' },
  { key: 'gsm', question: 'What paper thickness (GSM) do you require?' },
  { key: 'deadline', question: 'When do you need the order?' },
  { key: 'delivery_method', question: 'Do you need delivery or self-collection?' },
];

const FIELD_LABELS: Record<string, string> = {
  quantity: 'Quantity',
  standard_size: 'Size',
  width: 'Width (ft)',
  height: 'Height (ft)',
  paper_type: 'Paper type',
  gsm: 'GSM',
  colour_mode: 'Colour',
  sides: 'Sides',
  page_count: 'Page count',
  finishing_type: 'Finishing',
  deadline: 'Deadline',
  location: 'Location',
  delivery_method: 'Delivery',
};

@Component({
  selector: 'app-new-inquiry',
  standalone: true,
  imports: [FormsModule, IconComponent, DecimalPipe],
  templateUrl: './new-inquiry.component.html',
  styleUrl: './new-inquiry.component.scss',
})
export class NewInquiryComponent implements OnInit {
  private inquiryService = inject(InquiryService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);

  @ViewChild('messagesEnd') messagesEnd!: ElementRef<HTMLDivElement>;

  messages = signal<ChatMessage[]>([
    { role: 'bot', text: "Hi! Tell me what you'd like to print - include quantity, size, paper, finishing, and when you need it." },
  ]);
  currentInput = signal('');
  isProcessing = signal(false);

  categories = signal<PrintCategory[]>([]);
  selectedCategory = signal<PrintCategory | null>(null);
  specification = signal<Record<string, string | number>>({});

  stage = signal<'chatting' | 'reviewing' | 'submitting' | 'submitted'>('chatting');
  priceEstimate = signal<{ predicted_price: number; price_min: number; price_max: number } | null>(null);
  submitError = signal<string | null>(null);

  editableFields = computed(() =>
    Object.entries(this.specification()).map(([key, value]) => ({
      key,
      label: FIELD_LABELS[key] ?? key,
      value,
    })),
  );

  ngOnInit(): void {
    this.categoryService.listCategories().subscribe((data) => this.categories.set(data));
  }

  private findMissingField(): { key: string; question: string } | null {
    if (!this.selectedCategory()) {
      return REQUIRED_FIELDS[0];
    }
    for (const field of REQUIRED_FIELDS.slice(1)) {
      if (!this.specification()[field.key]) {
        return field;
      }
    }
    return null;
  }

  private tryResolveCategory(categoryText: string): void {
    if (this.selectedCategory()) return;
    const match = this.categories().find(
      (c) => c.name.toLowerCase() === categoryText.toLowerCase() || categoryText.toLowerCase().includes(c.name.toLowerCase()),
    );
    if (match) {
      this.selectedCategory.set(match);
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  sendMessage(): void {
    const text = this.currentInput().trim();
    if (!text || this.isProcessing()) return;

    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.currentInput.set('');
    this.isProcessing.set(true);
    this.scrollToBottom();

    this.inquiryService.extractSpecification(text).subscribe({
      next: (result) => {
        const { print_category_text, ...rest } = result.specification as Record<string, string | number> & {
          print_category_text?: string;
        };

        if (print_category_text) {
          this.tryResolveCategory(print_category_text);
        }

        this.specification.update((current) => ({ ...current, ...rest }));

        const missing = this.findMissingField();
        this.isProcessing.set(false);

        if (missing) {
          this.messages.update((m) => [...m, { role: 'bot', text: missing.question }]);
          this.scrollToBottom();
        } else {
          this.messages.update((m) => [...m, { role: 'bot', text: "Great, I have everything I need. Let me work out a price estimate..." }]);
          this.scrollToBottom();
          this.fetchPriceEstimate();
        }
      },
      error: () => {
        this.isProcessing.set(false);
        this.messages.update((m) => [...m, { role: 'bot', text: "Sorry, I couldn't process that. Could you try rephrasing?" }]);
        this.scrollToBottom();
      },
    });
  }

  fetchPriceEstimate(): void {
    const category = this.selectedCategory();
    if (!category) return;

    this.isProcessing.set(true);
    this.inquiryService.predictPrice({ ...this.specification(), print_category: category.name }).subscribe({
      next: (price) => {
        this.priceEstimate.set(price);
        this.isProcessing.set(false);
        this.stage.set('reviewing');
      },
      error: () => {
        this.isProcessing.set(false);
        this.messages.update((m) => [...m, { role: 'bot', text: "I couldn't calculate a price estimate just now. You can still review and submit your request." }]);
        this.stage.set('reviewing');
      },
    });
  }

  updateField(key: string, value: string): void {
    this.specification.update((current) => ({ ...current, [key]: value }));
  }

  submitInquiry(): void {
    const category = this.selectedCategory();
    if (!category) return;

    this.stage.set('submitting');
    this.submitError.set(null);

    const rawMessage = this.messages()
      .filter((m) => m.role === 'user')
      .map((m) => m.text)
      .join(' ');

    this.inquiryService
      .createInquiry({
        print_category_id: category.id,
        raw_message: rawMessage,
        ...this.specification(),
      })
      .subscribe({
        next: () => {
          this.stage.set('submitted');
        },
        error: (err) => {
          this.stage.set('reviewing');
          this.submitError.set(err.error?.error ?? 'Could not submit your inquiry. Please try again.');
        },
      });
  }

  goToDashboard(): void {
    this.router.navigate(['/customer/dashboard']);
  }
}
