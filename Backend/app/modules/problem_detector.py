import numpy as np


def detect_problems(df, target=None):

    problems = {}

    # Missing values
    missing = int(df.isnull().sum().sum())

    if missing > 0:
        problems["Missing Values"] = int(missing)

    # Duplicate rows
    duplicates = int(df.duplicated().sum())

    if duplicates > 0:
        problems["Duplicate Rows"] = int(duplicates)

    # Outlier detection using IQR
    numeric_cols = df.select_dtypes(include=np.number)

    outlier_columns = []

    for col in numeric_cols.columns:

        Q1 = numeric_cols[col].quantile(0.25)

        Q3 = numeric_cols[col].quantile(0.75)

        IQR = Q3 - Q1

        lower = Q1 - 1.5 * IQR

        upper = Q3 + 1.5 * IQR

        outliers = ((numeric_cols[col] < lower) | (numeric_cols[col] > upper)).sum()

        if outliers > 0:
            outlier_columns.append(col)

    if outlier_columns:
        problems["Outliers detected in"] = outlier_columns

    # Class imbalance detection
    if target and df[target].nunique() < 20:

        class_distribution = df[target].value_counts(normalize=True)

        problems["Class Distribution"] = class_distribution.to_dict()

    return problems