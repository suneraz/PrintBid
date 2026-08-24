/**
 * How the conversation actually works, since it's the most involved
 * piece of logic in the whole frontend:
 *
 * 1. The customer's FIRST message goes through the NER model
 *    (POST /ner/extract), since it's expected to be a fuller
 *    description ("500 double-sided business cards on 300 GSM...")
 *    that the model was actually trained to read.
 * 2. Once the bot has asked a SPECIFIC follow-up question ("How many
 *    copies do you need?"), the reply to that question is NOT sent
 *    through NER again - it's assigned directly to the field that
 *    was asked about. This matters: the NER model was trained on
 *    full sentences with surrounding context, not bare fragments
 *    like "12" with nothing around it, and testing showed it
 *    genuinely misclassifies those (a bare "16" got tagged as
 *    page_count instead of quantity, for example). Since we already
 *    know exactly which field a targeted follow-up answers, there's
 *    no ambiguity to resolve - skipping NER for these is both more
 *    reliable and faster.
 * 3. After each answer, `specification` (a running object that only
 *    ever grows) gets checked against the same required-fields list
 *    backend's missing_field_service.py uses, and the next missing
 *    one becomes the next question.
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

// Fields that expect a plain number as the answer - anything else in
// REQUIRED_FIELDS is treated as free text and used as typed.
const NUMERIC_FIELDS = new Set(['quantity', 'gsm']);

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

  // Which specific field the bot's last message asked about - null
  // while we're still on the open-ended opening question, since that
  // one still goes through NER rather than direct assignment.
  private askedFieldKey: string | null = null;

  stage = signal<'chatting' | 'reviewing' | 'submitting' | 'submitted'>('chatting');
  priceEstimate = signal<{ predicted_price: number; price_min: number; price_max: number } | null>(null);
  submitError = signal<string | null>(null);

  // Files chosen during the review step, held in the browser until
  // the inquiry itself is created - there's no inquiry ID to attach
  // them to before that point.
  selectedFiles = signal<File[]>([]);
  fileError = signal<string | null>(null);

  private static readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
  private static readonly MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
  private static readonly MAX_FILES = 5;

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // allows selecting the same file again after removing it

    this.fileError.set(null);

    for (const file of files) {
      if (this.selectedFiles().length >= NewInquiryComponent.MAX_FILES) {
        this.fileError.set(`You can attach up to ${NewInquiryComponent.MAX_FILES} files.`);
        break;
      }
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!NewInquiryComponent.ALLOWED_EXTENSIONS.includes(extension)) {
        this.fileError.set('Only JPG, PNG, and PDF files are accepted.');
        continue;
      }
      if (file.size > NewInquiryComponent.MAX_FILE_SIZE_BYTES) {
        this.fileError.set('Files must be under 8 MB.');
        continue;
      }
      this.selectedFiles.update((current) => [...current, file]);
    }
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.update((current) => current.filter((_, i) => i !== index));
  }

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

  private tryResolveCategory(categoryText: string): boolean {
    if (this.selectedCategory()) return true;
    const text = categoryText.toLowerCase().trim();

    // Checked in both directions so singular/plural mismatches still
    // match - "sticker" said by the customer against "stickers" in
    // the database, or the other way round.
    const match = this.categories().find(
      (c) => c.name.toLowerCase() === text || c.name.toLowerCase().includes(text) || text.includes(c.name.toLowerCase()),
    );
    if (match) {
      this.selectedCategory.set(match);
      return true;
    }
    return false;
  }

  private scrollToBottom(): void {
    setTimeout(() => this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  private askNext(): void {
    const missing = this.findMissingField();
    this.askedFieldKey = missing?.key ?? null;

    if (missing) {
      this.messages.update((m) => [...m, { role: 'bot', text: missing.question }]);
      this.scrollToBottom();
    } else {
      this.messages.update((m) => [...m, { role: 'bot', text: "Great, I have everything I need. Let me work out a price estimate..." }]);
      this.scrollToBottom();
      this.fetchPriceEstimate();
    }
  }

  sendMessage(): void {
    const text = this.currentInput().trim();
    if (!text || this.isProcessing()) return;

    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.currentInput.set('');
    this.isProcessing.set(true);
    this.scrollToBottom();

    // A targeted follow-up already tells us which field this answer
    // is for - assign it directly rather than re-running NER on a
    // bare fragment it wasn't trained to interpret.
    if (this.askedFieldKey) {
      this.assignDirectAnswer(this.askedFieldKey, text);
      return;
    }

    this.inquiryService.extractSpecification(text).subscribe({
      next: (result) => {
        const { print_category_text, ...rest } = result.specification as Record<string, string | number> & {
          print_category_text?: string;
        };

        if (print_category_text) {
          this.tryResolveCategory(print_category_text);
        }

        this.specification.update((current) => ({ ...current, ...rest }));
        this.isProcessing.set(false);
        this.askNext();
      },
      error: () => {
        this.isProcessing.set(false);
        this.messages.update((m) => [...m, { role: 'bot', text: "Sorry, I couldn't process that. Could you try rephrasing?" }]);
        this.scrollToBottom();
      },
    });
  }

  private assignDirectAnswer(fieldKey: string, text: string): void {
    if (fieldKey === 'category') {
      const resolved = this.tryResolveCategory(text);
      this.isProcessing.set(false);
      if (!resolved) {
        this.messages.update((m) => [
          ...m,
          { role: 'bot', text: "I don't recognise that category - could you pick one like business cards, flyers, banners, or stickers?" },
        ]);
        this.scrollToBottom();
        return;
      }
      this.askNext();
      return;
    }

    if (NUMERIC_FIELDS.has(fieldKey)) {
      const numberMatch = text.match(/\d+/);
      if (!numberMatch) {
        this.isProcessing.set(false);
        this.messages.update((m) => [...m, { role: 'bot', text: "That doesn't look like a number - could you enter just the amount?" }]);
        this.scrollToBottom();
        return;
      }
      this.specification.update((current) => ({ ...current, [fieldKey]: Number(numberMatch[0]) }));
    } else {
      this.specification.update((current) => ({ ...current, [fieldKey]: text }));
    }

    this.isProcessing.set(false);
    this.askNext();
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
        next: (inquiry) => this.uploadAttachmentsThenFinish(inquiry.id),
        error: (err) => {
          this.stage.set('reviewing');
          this.submitError.set(err.error?.error ?? 'Could not submit your inquiry. Please try again.');
        },
      });
  }

  /**
   * Uploads happen one at a time (not in parallel) purely to keep
   * this straightforward - inquiries realistically have at most a
   * handful of attachments, so there's no real performance cost to
   * doing them sequentially. A failed attachment upload doesn't roll
   * back the inquiry itself, since the inquiry was already created
   * successfully and is more important than the reference files.
   */
  private uploadAttachmentsThenFinish(inquiryId: number, index = 0): void {
    const files = this.selectedFiles();
    if (index >= files.length) {
      this.stage.set('submitted');
      return;
    }

    this.inquiryService.uploadAttachment(inquiryId, files[index]).subscribe({
      next: () => this.uploadAttachmentsThenFinish(inquiryId, index + 1),
      error: () => {
        // Don't block the rest of the submission flow over one
        // failed file - move on to the next, and the inquiry is
        // still marked submitted at the end either way.
        this.uploadAttachmentsThenFinish(inquiryId, index + 1);
      },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/customer/dashboard']);
  }
}
