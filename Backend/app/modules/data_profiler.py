import pandas as pd

def profile_dataset(df):

    profile = {}

    profile["Number of rows"] = df.shape[0]

    profile["Number of columns"] = df.shape[1]

    profile["Missing values per column"] = df.isnull().sum().to_dict()

    profile["Duplicate rows"] = df.duplicated().sum()

    profile["Data types"] = df.dtypes.astype(str).to_dict()

    return profile