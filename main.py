from dotenv import load_dotenv
load_dotenv()
from backend.comparison.comp import compare_papers, print_comparison_table

if __name__ == "__main__":
    papers = [
        r"C:\Users\Sanya\Downloads\N19-1423BERT.pdf",
        r"C:\Users\Sanya\Downloads\NIPS-2017-attention-is-all-you-need-Paper.pdf",
    ]

    results = compare_papers(papers)
    print_comparison_table(results)