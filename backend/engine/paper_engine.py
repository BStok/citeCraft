#takes input of the section of paper being referred to from paper parsing
import paper_parsing
import re
from lxml import etree
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np


tree = etree.parse("output.xml")
root = tree.getroot()

#sections - What part of the paper
section = {"Abstract" : 0,
           "Metadata" : 1,
           "Introduction" : 2,
           "Literature Review" : 3,
           "Method" : 4,
           "Result" : 5,
           "Discussion" : 6,
           "Full text" : 7
           }

#section wise dropdowns
Abstract_dropdown = {"view Section" : 0, 
                     "Extract Key points" : 1,
                     "Explain like I am 5" : 2}

Metadata_dropdown = {"View Section" : 0}

Introduction_dropdown = {"View Section" : 0,
                         "Extract Key Points" : 1,
                         "Explain like I am 5" :2 ,
                         "List Citations" : 3}

Lit_dropdown = {"View Section" : 0,
                 "Extract Key Points" : 1,
                 "Explain like I am 5" :2 ,
                 "List Citations" : 3,
                 "Summarize" : 4}

Methodology_dropdown = {"View Section" : 0,
                 "Extract Key Points" : 1,
                 "Explain like I am 5" :2 ,
                 "List Citations" : 3,
                 "Highlight structure" : 5,
                 "Summarize" : 4}

Result_dropdown = {"View Section" : 0,
                 "Extract Key Points" : 1,
                 "Explain like I am 5" :2 ,
                 "List Citations" : 3,
                 "Highlight structure" : 5,
                 "Summarize" : 4}

Discussion_dropdown = {"View Section" : 0,
                 "Extract Key Points" : 1,
                 "Explain like I am 5" :2 ,
                 "List Citations" : 3,
                 "Highlight structure" : 5,
                 "Future Scope" : 6,
                 "Challenges" : 7,
                 "Summarize" : 4}

FullText_dropdown = {"List Citations" : 3,
                     "Self Citation Count" : 6,
                     "Highlight Structure" : 5,
                     "Summarize": 4}


#operations dictionary
dropdown_operation = {"view Section" : 0, 
                      "Extract Key Points" : 1, 
                      "Highlight Structure": 5, 
                      "Export": 5,
                      "Explain simply" : 6}

Entities = {
                          "Datasets": 0,
                          "Metrics": 1,
                          "Model/Architecture": 2,
                          "Hyperparameter":3,
                          "Problem Defination":4,
                      }

def paper_understanding():
    section = Section_Dropdown()[0]
    subsection = Section_Dropdown()[1]
    op = Operation_Dropdown()

    #view
    if(op == 1):
        viewSection(section)

    elif(op == 2):
        extractEntities(section,subsection)

    elif(op == 3):
        extractEntities(section,subsection)
    

def Section_Dropdown():
    sn = input("Enter the section : ")
    return section[sn]


def Operation_Dropdown():
    op = input("Enter operation : ")
    if(dropdown_operation[op] == 1):
        sub_op = input("Enter entity : ")
        return viewSection(sub_op)
    
def viewSection(section):
    return paper_parsing.extractSection(root,section)

def extractEntities(section,subsection):
    """Returns 5-8 high ranked sentences"""

    text = paper_parsing.extractSection(section)

    #step 1: sentence segmentation using space
    nlp = spacy.load("en_core_web_sm")
    doc = nlp(text)
    
    #step 2: cleaning = remove citations + whitespace + lowercase + strip stopwords + lemmatization
    sentences = [sent.text.strip() for sent in doc.sents]
    cleaned_sentences = [cleanSentences(s) for s in sentences]

    #step 3: TF-IDF Vectorization [Term Frequency-Inverse Document Frequency]
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(cleaned_sentences)

    sentence_scores = np.array(X.sum(axis=1)).flatten()
    ranked_indices = sentence_scores.argsort()[::-1]

    top_sentences = [sentences[i] for i in ranked_indices[:]]

    return top_sentences



def cleanSentences(text):
    # 1. Remove citation patterns
    text = re.sub(r"\[[0-9,\s\-]+\]", "", text)  # [12], [1,2,3], [4-7]
    text = re.sub(r"\([A-Za-z\s.,&]+?\d{4}\)", "", text)  # (Smith et al., 2020)
    text = re.sub(r"Figure\s?\d+|Table\s?\d+", "", text, flags=re.IGNORECASE)

    # 2. Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # 3. Lowercase
    text = text.lower()

    doc = nlp(text)

    cleaned_sentences = []

    for sent in doc.sents:
        tokens = []

        for token in sent:
            # Skip punctuation, stopwords, spaces
            if token.is_stop or token.is_punct or token.is_space:
                continue

            # Keep alphabetic tokens only
            if not token.is_alpha:
                continue

            # Lemmatize
            lemma = token.lemma_.strip()

            if lemma:
                tokens.append(lemma)

        # Skip very short sentences
        if len(tokens) >= 6:
            cleaned_sentences.append(" ".join(tokens))

    return cleaned_sentences

se = "demo"
su = "also demo"
doc = extractEntities(se,su)
for sent in doc.sents:
    print("\n", sent.text)

