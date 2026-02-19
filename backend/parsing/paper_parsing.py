import re
from lxml import etree

tree = etree.parse("output.xml")
root = tree.getroot()

#register namespace globally
ns = {"tei": "http://www.tei-c.org/ns/1.0"}

def extractTitle():
    """extracts metadat including- Title, authors, DOI/ISSN, publication date, journal detail from paper for effective summarization"""
    #1: title
    title = root.xpath(
        "//tei:titleStmt/tei:title[@level='a' and @type='main']/text()",
        namespaces=ns
    )

    #2: Authors
    # 2: Authors (paper only)
    authors = []
    for author in root.xpath(
        "/tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/"
        "tei:biblStruct/tei:analytic/tei:author",
        namespaces=ns
    ):
        forename = author.xpath(".//tei:forename/text()", namespaces=ns)
        surname  = author.xpath(".//tei:surname/text()", namespaces=ns)
        authors.append(" ".join(forename + surname))

    return authors

    #3:Publishing Date
    
def extract_abstract(root):
    """Extracts abstract text from a GROBID TEI XML"""
    abstract_nodes = root.xpath(
        "/tei:TEI/tei:teiHeader/tei:profileDesc/tei:abstract",
        namespaces=ns
    )
    # fallback to fileDesc 
    if not abstract_nodes:
        abstract_nodes = root.xpath(
            "/tei:TEI/tei:teiHeader/tei:fileDesc/tei:abstract",
            namespaces=ns
        )

    if not abstract_nodes:
        return ""  # No abstract found

    # Get all inner text recursively
    abstract_text = " ".join(abstract_nodes[0].xpath(".//text()", namespaces=ns))
    abstract_text = re.sub(r"\s+", " ", abstract_text).strip()
    return abstract_text

def extractSection(root, section_name):
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}
    
    # Find <head> with matching text (case-insensitive)
    heads = root.xpath(
        f"//tei:div/tei:head[translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='{section_name.lower()}']",
        namespaces=ns
    )
    
    if not heads:
        return ""  # section not found
    
    # Take the parent <div>
    section_div = heads[0].getparent()
    
    # Get all inner text recursively
    section_text = " ".join(section_div.xpath(".//text()", namespaces=ns))
    section_text = re.sub(r"\s+", " ", section_text).strip()
    
    return section_text

#def extractRef(root):

print(extract_abstract(root))



       

