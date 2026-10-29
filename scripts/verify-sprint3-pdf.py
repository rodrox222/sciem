"""Verifica texto y cifras reales del PDF contra la referencia SQL del QA aislado."""
import json
import pathlib
import re
import subprocess
import sys

root = pathlib.Path(sys.argv[1])
subprocess.run(["pdftotext", "-layout", str(root / "reporte.pdf"), str(root / "reporte-pdf.txt")], check=True)
text = (root / "reporte-pdf.txt").read_text()
reference = json.loads((root / "referencia.json").read_text())["resumen"]
labels = {
    "total_inscritos": "Total inscritos",
    "total_asistentes": "Total asistentes",
    "total_ausentes": "Total ausentes",
    "intentos_inhabilitados": "Intentos de estudiantes inhabilitados",
    "intentos_no_inscritos": "Intentos de personas no inscritas",
    "ingresos_duplicados_bloqueados": "Ingresos duplicados bloqueados",
}
for key, label in labels.items():
    assert re.search(re.escape(label) + r"\s+" + str(reference[key]) + r"\b", text), f"PDF no coincide: {key}"
for expected in ["José", "Pérez", "Ñúñez", "Detalle de asistencia", "Intentos rechazados", "Ingresos por franja horaria", "America/La_Paz"]:
    assert expected in text, f"PDF perdió contenido: {expected}"
for hour in range(24):
    assert f"{hour:02}:00" in text, f"PDF perdió franja {hour}"
print("PASS PDF: seis cifras SQL, contenido de tablas, tildes/ñ y 24 franjas")
