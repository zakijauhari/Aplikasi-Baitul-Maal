import os
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
)
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.models import Transaksi, Kategori, ProfilMasjid

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BASE_DIR, "pdf_arsip")
os.makedirs(PDF_DIR, exist_ok=True)


def format_rupiah(value: int) -> str:
    s = f"{value:,}".replace(",", ".")
    return f"Rp{s}"


def generate_laporan_pdf(
    db: Session,
    bulan: int,
    tahun: int,
    nama_masjid: str = "Masjid",
    logo_path: Optional[str] = None,
) -> str:
    nama_bulan = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ]

    filename = f"laporan_{tahun}_{bulan:02d}.pdf"
    filepath = os.path.join(PDF_DIR, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=20*mm, bottomMargin=20*mm)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "TitleCustom", parent=styles["Title"],
        fontSize=18, spaceAfter=6, alignment=1,
    ))
    styles.add(ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=12, spaceAfter=20, alignment=1,
        textColor=colors.HexColor("#0F3D2E"),
    ))
    styles.add(ParagraphStyle(
        "SectionHeader", parent=styles["Heading2"],
        fontSize=14, spaceBefore=20, spaceAfter=10,
        textColor=colors.HexColor("#0F3D2E"),
    ))
    styles.add(ParagraphStyle(
        "TableHeader", parent=styles["Normal"],
        fontSize=9, textColor=colors.white,
    ))
    styles.add(ParagraphStyle(
        "TableCell", parent=styles["Normal"],
        fontSize=9,
    ))
    styles.add(ParagraphStyle(
        "SaldoAwal", parent=styles["Normal"],
        fontSize=11, spaceBefore=10, spaceAfter=10,
    ))

    elements = []

    elements.append(Paragraph(f"LAPORAN KEUANGAN", styles["TitleCustom"]))
    elements.append(Paragraph(nama_masjid, styles["Subtitle"]))
    elements.append(Paragraph(f"Periode: {nama_bulan[bulan]} {tahun}", styles["Subtitle"]))
    elements.append(Spacer(1, 10*mm))

    saldo_sebelum = db.query(func.coalesce(func.sum(
        case(
            (Transaksi.tipe == "pemasukan", Transaksi.nominal),
            else_=0
        )
    ), 0) - func.coalesce(func.sum(
        case(
            (Transaksi.tipe == "pengeluaran", Transaksi.nominal),
            else_=0
        )
    ), 0)).filter(
        Transaksi.tanggal < f"{tahun}-{bulan:02d}-01",
        Transaksi.deleted_at.is_(None)
    ).scalar() or 0

    elements.append(Paragraph(
        f"<b>Saldo Awal Periode:</b> {format_rupiah(saldo_sebelum)}",
        styles["SaldoAwal"]
    ))
    elements.append(Spacer(1, 5*mm))

    pemasukan = db.query(Transaksi).filter(
        Transaksi.tipe == "pemasukan",
        func.extract("month", Transaksi.tanggal) == bulan,
        func.extract("year", Transaksi.tanggal) == tahun,
        Transaksi.deleted_at.is_(None)
    ).order_by(Transaksi.tanggal).all()

    elements.append(Paragraph("PEMASUKAN", styles["SectionHeader"]))

    if pemasukan:
        data = [[
            Paragraph("Tanggal", styles["TableHeader"]),
            Paragraph("Kategori", styles["TableHeader"]),
            Paragraph("Keterangan", styles["TableHeader"]),
            Paragraph("Nominal", styles["TableHeader"]),
        ]]
        total_pemasukan = 0
        for t in pemasukan:
            kat = db.query(Kategori).filter(Kategori.id == t.kategori_id).first()
            data.append([
                Paragraph(t.tanggal.strftime("%d/%m/%Y"), styles["TableCell"]),
                Paragraph(kat.nama if kat else "-", styles["TableCell"]),
                Paragraph(t.deskripsi or "-", styles["TableCell"]),
                Paragraph(format_rupiah(t.nominal), styles["TableCell"]),
            ])
            total_pemasukan += t.nominal

        data.append([
            Paragraph("<b>Total Pemasukan</b>", styles["TableCell"]),
            "", "",
            Paragraph(f"<b>{format_rupiah(total_pemasukan)}</b>", styles["TableCell"]),
        ])

        table = Table(data, colWidths=[60, 80, 180, 80])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F3D2E")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.grey),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E8F5E9")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F5F5F5")]),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("Tidak ada data pemasukan.", styles["Normal"]))

    elements.append(Spacer(1, 10*mm))

    pengeluaran = db.query(Transaksi).filter(
        Transaksi.tipe == "pengeluaran",
        func.extract("month", Transaksi.tanggal) == bulan,
        func.extract("year", Transaksi.tanggal) == tahun,
        Transaksi.deleted_at.is_(None)
    ).order_by(Transaksi.tanggal).all()

    elements.append(Paragraph("PENGELUARAN", styles["SectionHeader"]))

    if pengeluaran:
        data = [[
            Paragraph("Tanggal", styles["TableHeader"]),
            Paragraph("Kategori", styles["TableHeader"]),
            Paragraph("Keterangan", styles["TableHeader"]),
            Paragraph("Nominal", styles["TableHeader"]),
        ]]
        total_pengeluaran = 0
        for t in pengeluaran:
            kat = db.query(Kategori).filter(Kategori.id == t.kategori_id).first()
            data.append([
                Paragraph(t.tanggal.strftime("%d/%m/%Y"), styles["TableCell"]),
                Paragraph(kat.nama if kat else "-", styles["TableCell"]),
                Paragraph(t.deskripsi or "-", styles["TableCell"]),
                Paragraph(format_rupiah(t.nominal), styles["TableCell"]),
            ])
            total_pengeluaran += t.nominal

        data.append([
            Paragraph("<b>Total Pengeluaran</b>", styles["TableCell"]),
            "", "",
            Paragraph(f"<b>{format_rupiah(total_pengeluaran)}</b>", styles["TableCell"]),
        ])

        table = Table(data, colWidths=[60, 80, 180, 80])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F3D2E")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.grey),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#FFEBEE")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F5F5F5")]),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("Tidak ada data pengeluaran.", styles["Normal"]))

    elements.append(Spacer(1, 10*mm))

    total_pemasukan = sum(t.nominal for t in pemasukan)
    total_pengeluaran = sum(t.nominal for t in pengeluaran)
    saldo_akhir = saldo_sebelum + total_pemasukan - total_pengeluaran

    elements.append(Paragraph(
        f"<b>Saldo Akhir Periode:</b> {format_rupiah(saldo_akhir)}",
        styles["SaldoAwal"]
    ))
    elements.append(Paragraph(
        f"<i>(Saldo Awal {format_rupiah(saldo_sebelum)} + Pemasukan {format_rupiah(total_pemasukan)} - Pengeluaran {format_rupiah(total_pengeluaran)})</i>",
        styles["Normal"]
    ))

    elements.append(Spacer(1, 20*mm))
    elements.append(Paragraph(
        "Mengetahui,<br/>Bendahara Masjid<br/><br/><br/><br/>"
        "( ____________________ )<br/>Nama Bendahara",
        styles["Normal"]
    ))

    doc.build(elements)
    return filepath
