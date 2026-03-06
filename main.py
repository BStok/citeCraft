# main.py (sits in citeCraft/)
from backend.comparison.comp import compare_papers, print_comparison_table

if __name__ == "__main__":
    papers = [
        r"C:\Users\Sanya\Downloads\advLearning_cx.pdf",
        r"C:\Users\Sanya\Downloads\paper2.pdf",
    ]

    results = compare_papers(papers)
    print_comparison_table(results)