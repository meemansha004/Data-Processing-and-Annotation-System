import pandas as pd
import numpy as np


def preprocess_data(df, pipeline, steps):
    """
    Full preprocessing:
    1. Manual cleaning (duplicates, outliers, log)
    2. Sklearn pipeline (impute, scale, encode)
    """

    df = df.copy()

    # -------------------------
    # 1. REMOVE DUPLICATES
    # -------------------------
    if steps.get("duplicates"):
        df = df.drop_duplicates()

    # -------------------------
    # 2. HANDLE OUTLIERS (IQR)
    # -------------------------
    if steps.get("outliers", True):  # default ON
        num_cols = df.select_dtypes(include="number").columns

        for col in num_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1

            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR

            df = df[(df[col] >= lower) & (df[col] <= upper)]

    # -------------------------
    # 3. LOG TRANSFORM
    # -------------------------
    if steps.get("log"):
        num_cols = df.select_dtypes(include="number").columns

        for col in num_cols:
            # avoid log(0) / negative issues
            df[col] = df[col].apply(
                lambda x: np.log1p(x) if x > 0 else x
            )

    # -------------------------
    # 4. CLEAN CATEGORICAL TEXT
    # -------------------------
    if steps.get("categorical"):
        cat_cols = df.select_dtypes(include="object").columns

        for col in cat_cols:
            df[col] = df[col].astype(str).str.lower().str.strip()

    # -------------------------
    # 5. APPLY SKLEARN PIPELINE
    # -------------------------
    X_processed = pipeline.fit_transform(df)

    # Try to get feature names
    try:
        feature_names = pipeline.get_feature_names_out()
    except:
        feature_names = [f"feature_{i}" for i in range(X_processed.shape[1])]

    processed_df = pd.DataFrame(X_processed, columns=feature_names)

    return processed_df