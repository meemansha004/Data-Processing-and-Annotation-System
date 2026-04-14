from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder


def build_pipeline(num_cols, cat_cols, steps):

    transformers = []

    # -------------------
    # NUMERICAL PIPELINE
    # -------------------
    num_steps = []

    if steps.get("missing"):
        num_steps.append(("imputer", SimpleImputer(strategy="mean")))

    if steps.get("scaling"):
        num_steps.append(("scaler", StandardScaler()))

    if num_steps:
        transformers.append(("num", Pipeline(num_steps), num_cols))

    # -------------------
    # CATEGORICAL PIPELINE
    # -------------------
    cat_steps = []

    if steps.get("missing"):
        cat_steps.append(("imputer", SimpleImputer(strategy="most_frequent")))

    if steps.get("encoding"):
        cat_steps.append(("encoder", OneHotEncoder(handle_unknown="ignore")))

    if cat_steps:
        transformers.append(("cat", Pipeline(cat_steps), cat_cols))

    # -------------------
    # FINAL PIPELINE
    # -------------------
    preprocessor = ColumnTransformer(transformers)

    return preprocessor