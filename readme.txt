LIMS v1.1 — Full Offline PWA

IMPORTANT PDF/PRINT FIX

Report, Registration Voucher, Manual Voucher and Invoice now use the SAME native print renderer as their on-screen preview. This prevents the previous problem where the direct JavaScript PDF text export looked different from the preview.

When you tap "Save to PDF":
1. The app opens the device's native print preview.
2. The printed page is rendered from the same HTML/CSS used by the preview.
3. On Android/Chrome choose "Save as PDF" and save the file.
4. On desktop choose the system PDF printer / Save as PDF.
5. On iOS use the system print/share flow and save the PDF.

No internet, CDN, html2pdf, API or external JavaScript is required for the LIMS core.

Storage
- Existing V11 localStorage key is retained: biotech_lims_general_v10
- Existing local data is not intentionally overwritten by the update.

App identity
- Name: LIMS
- Version: 1.0
- Display: standalone

PDF filenames
- Report_<patient>_<date>.pdf
- Voucher_<id>_<date>.pdf
- Invoice_<invoice>_<date>.pdf

The icon files are bundled locally in icons/ and are not loaded from the internet.


V1.3 update: larger A4 report print typography (12 pt main / 11 pt table), preserved newlines in interpretation/comment, and /HPF units for Urine RE RBC/WBC/EC/Pus Cells fields.
