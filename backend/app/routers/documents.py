import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings
from app.services.document_parser import extract_document_text
from app.services.ai_extractor import extract_agreement_data
from app.schemas import ExtractedAgreementData

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".txt"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/upload", response_model=ExtractedAgreementData)
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_document"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: PDF, DOCX, PNG, JPG, JPEG"
        )

    # Save uploaded file
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{filename}"
    saved_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Check file size
    file_size = os.path.getsize(saved_path)
    if file_size > MAX_FILE_SIZE:
        os.remove(saved_path)
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of 25MB."
        )

    # Extract text from document
    extracted_text = extract_document_text(saved_path, content_type=file.content_type or "")
    
    # Extract structured legal terms
    extracted_data = await extract_agreement_data(extracted_text, filename, saved_path)
    extracted_data.file_path = saved_path
    extracted_data.document_name = filename
    extracted_data.document_type = ext.replace(".", "")

    return extracted_data
