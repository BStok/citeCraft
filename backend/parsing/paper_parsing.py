import re
from lxml import etree
import requests
from pathlib import Path

XML_OUTPUT_DIR = Path("./data/parsed_xmls")

ns = {"tei": "http://www.tei-c.org/ns/1.0"}

#converts pdf to xml 
def pdf_to_tei_xml(pdf_path, output_path, grobid_url="http://localhost:8070/api/processFulltextDocument"):
    with open(pdf_path, "rb") as pdf:
        files = {"input": pdf}
        response = requests.post(grobid_url, files=files)

    response.raise_for_status()

    with open(output_path, "wb") as f:
        f.write(response.content)

    return output_path

#loads existing xml file
def load_xml(filepath):
    tree = etree.parse(filepath)
    return tree.getroot()

# 1.1. Title  - Metadata
def extract_title(root):
    title = root.xpath(
        "//tei:titleStmt/tei:title[@level='a' and @type='main']/text()",
        namespaces=ns
    )
    return title[0].strip() if title else ""

# 1.2. Author Details
def extract_authors(root):
    authors = []
    for author in root.xpath(
        "/tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/"
        "tei:biblStruct/tei:analytic/tei:author",
        namespaces=ns
    ):
        forename = author.xpath(".//tei:forename/text()", namespaces=ns)
        surname  = author.xpath(".//tei:surname/text()", namespaces=ns)
        full = " ".join(forename + surname).strip()
        if full:
            authors.append(full)
    return authors

# 1.3. Date
def extract_date(root):
    date = root.xpath(
        "//tei:publicationStmt/tei:date/@when",
        namespaces=ns
    )
    if not date:
        date = root.xpath(
            "//tei:biblStruct//tei:date/@when",
            namespaces=ns
        )
    return date[0] if date else ""

# 2. Abstract
def extract_abstract(root):
    for xpath in [
        "/tei:TEI/tei:teiHeader/tei:profileDesc/tei:abstract",
        "/tei:TEI/tei:teiHeader/tei:fileDesc/tei:abstract"
    ]:
        nodes = root.xpath(xpath, namespaces=ns)
        if nodes:
            text = " ".join(nodes[0].xpath(".//text()", namespaces=ns))
            return re.sub(r"\s+", " ", text).strip()
    return ""

# Maps canonical section names to common heading variants found in papers
SECTION_ALIASES = {
    "introduction":  ["introduction", "intro"],
    "related_work":  ["related work", "background", "literature review", 
                      "prior work", "previous work", "state of the art"],
    "methodology":   ["methodology", "methods", "method", "approach", 
                      "proposed method", "our approach", "system", "model"],
    "experiments":   ["experiments", "experimental setup", "evaluation", 
                      "experimental results", "results", "results and discussion"],
    "conclusion":    ["conclusion", "conclusions", "concluding remarks", 
                      "summary", "discussion and conclusion"],
    "discussion":    ["discussion", "analysis", "ablation study", "ablation"],
}

# 3. sections
def extract_section(root, canonical_name):
    """
    Extract a section by canonical name using alias matching.
    Falls back to partial/substring match if exact match fails.
    """
    aliases = SECTION_ALIASES.get(canonical_name, [canonical_name])
    
    all_divs = root.xpath("//tei:body//tei:div[tei:head]", namespaces=ns)
    
    # 1. Exact match against aliases
    for div in all_divs:
        head = div.xpath("tei:head/text()", namespaces=ns)
        if head:
            head_text = head[0].strip().lower()
            if head_text in aliases:
                return _div_to_text(div)
    
    # 2. Substring/partial match as fallback
    for div in all_divs:
        head = div.xpath("tei:head/text()", namespaces=ns)
        if head:
            head_text = head[0].strip().lower()
            if any(alias in head_text or head_text in alias for alias in aliases):
                return _div_to_text(div)
    
    return ""

def _div_to_text(div):
    """Converts a <div> node to clean plain text."""
    text = " ".join(div.xpath(".//text()", namespaces=ns))
    return re.sub(r"\s+", " ", text).strip()

# continued 4. 
def extract_all_sections(root):
    """
    Extracts ALL sections with their headings — useful as a fallback
    or for discovery when you don't know the structure ahead of time.
    """
    sections = {}
    for div in root.xpath("//tei:body//tei:div[tei:head]", namespaces=ns):
        head = div.xpath("tei:head/text()", namespaces=ns)
        if head:
            heading = head[0].strip()
            sections[heading] = _div_to_text(div)
    return sections

# ===MASTER FUNC===
def extract_paper(root):  # takes root, not filepath
    structured = {
        "title":        extract_title(root),
        "authors":      extract_authors(root),
        "date":         extract_date(root),
        "abstract":     extract_abstract(root),
        "introduction": extract_section(root, "introduction"),
        "related_work": extract_section(root, "related_work"),
        "methodology":  extract_section(root, "methodology"),
        "experiments":  extract_section(root, "experiments"),
        "discussion":   extract_section(root, "discussion"),
        "conclusion":   extract_section(root, "conclusion"),
    }

    missing = [k for k, v in structured.items() if not v and k not in ("authors", "date")]
    if missing:
        all_sections = extract_all_sections(root)
        structured["_available_headings"] = list(all_sections.keys())
        structured["_missing_sections"] = missing

    return structured

def format_for_llm(extracted: dict) -> str:
    """
    Converts the extracted dict into a clean string prompt block for the LLM.
    Skips empty sections and debug keys.
    """
    skip_keys = {"_available_headings", "_missing_sections"}
    lines = []
    for key, value in extracted.items():
        if key in skip_keys:
            continue
        if not value:
            continue
        label = key.replace("_", " ").upper()
        if isinstance(value, list):
            lines.append(f"## {label}\n{', '.join(value)}")
        else:
            lines.append(f"## {label}\n{value}")
    return "\n\n".join(lines)

#orchestration function 
def process_pdf(pdf_path: str) -> str:
    """
    Full pipeline: PDF → XML → extracted dict → LLM-ready string.
    Returns the formatted string ready to pass to the LLM.
    """
    pdf_path = Path(pdf_path)
    XML_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Convert PDF → XML, save to folder
    xml_path = XML_OUTPUT_DIR / pdf_path.with_suffix(".tei.xml").name
    pdf_to_tei_xml(str(pdf_path), str(xml_path))
    
    # Step 2: Load & parse XML
    root = load_xml(str(xml_path))
    
    # Step 3: Extract
    paper = extract_paper(root)  # note: pass root, not filepath
    
    # Step 4: Format for LLM
    return format_for_llm(paper)

path = r"C:\Users\Sanya\Downloads\minimizerRP.pdf"
struc = process_pdf(path)
print(struc)