import io
from PyPDF2 import PdfReader


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Takes raw PDF bytes (from an uploaded file) and returns extracted plain text.
    Raises ValueError if the PDF has no extractable text (e.g. scanned image).
    """
    reader = PdfReader(io.BytesIO(file_bytes))

    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text_parts.append(page_text)

    full_text = "\n".join(text_parts).strip()

    if not full_text:
        raise ValueError(
            "Could not extract text from this PDF. It may be a scanned "
            "image rather than a text-based document."
        )

    return full_text
