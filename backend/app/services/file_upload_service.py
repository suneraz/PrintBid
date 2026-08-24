"""
Shared file-saving logic. Used for inquiry attachments now, and
written generically enough to reuse for print shop portfolio uploads
later - both are "customer/shop uploads a file, we validate it, save
it under a unique name, and hand back the metadata to store in the
database" with only the allowed extensions and destination folder
differing.
"""

import os
import uuid

from flask import current_app
from werkzeug.utils import secure_filename

ALLOWED_DOCUMENT_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB per file


class FileUploadError(Exception):
    """Raised for any validation failure - the route turns this into a 400."""


def _extension(filename):
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def save_upload(file_storage, subfolder, allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS):
    """
    Validates and saves an uploaded werkzeug FileStorage object.
    Returns a dict of metadata to store on the corresponding model
    row. Raises FileUploadError with a message safe to show the user
    if validation fails.
    """
    if file_storage is None or file_storage.filename == "":
        raise FileUploadError("No file was provided.")

    original_filename = secure_filename(file_storage.filename)
    extension = _extension(original_filename)
    if extension not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise FileUploadError(f"File type not allowed. Accepted types: {allowed}.")

    # Read once to check size, then reset the stream position - the
    # file needs to still be at the start when .save() reads it below.
    file_storage.stream.seek(0, os.SEEK_END)
    size_bytes = file_storage.stream.tell()
    file_storage.stream.seek(0)

    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise FileUploadError(f"File is too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.")

    # A random stored filename, not the customer's original one -
    # avoids collisions between different customers uploading files
    # with the same name, and avoids trusting user input in a path.
    stored_filename = f"{uuid.uuid4().hex}.{extension}"

    destination_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], subfolder)
    os.makedirs(destination_dir, exist_ok=True)
    file_storage.save(os.path.join(destination_dir, stored_filename))

    return {
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "content_type": file_storage.content_type,
        "size_bytes": size_bytes,
    }


def resolve_upload_path(subfolder, stored_filename):
    return os.path.join(current_app.config["UPLOAD_FOLDER"], subfolder, stored_filename)
