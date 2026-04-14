import numpy as np

def calculate_quality_score(df):

    score = 100

    # ----------------
    # Missing values
    # ----------------
    missing_ratio = df.isnull().mean().mean()

    if missing_ratio > 0.3:
        score -= 25
    elif missing_ratio > 0.1:
        score -= 15
    elif missing_ratio > 0:
        score -= 5

    # ----------------
    # Duplicates
    # ----------------
    duplicates = df.duplicated().sum()

    if duplicates > 0:
        score -= 10

    # ----------------
    # Outliers
    # ----------------
    numeric_cols = df.select_dtypes(include=np.number)

    outlier_count = 0

    for col in numeric_cols.columns:

        Q1 = numeric_cols[col].quantile(0.25)
        Q3 = numeric_cols[col].quantile(0.75)

        IQR = Q3 - Q1

        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR

        outliers = ((numeric_cols[col] < lower) | (numeric_cols[col] > upper)).sum()

        outlier_count += outliers

    if outlier_count > 0:
        score -= 10

    # ----------------
    # Categorical inconsistencies
    # ----------------
    cat_cols = df.select_dtypes(include="object")

    for col in cat_cols.columns:

        values = cat_cols[col].dropna().unique()

        if any(v.lower() != v for v in values if isinstance(v,str)):
            score -= 5
            break

    if score < 0:
        score = 0

    return int(score)