from typing import List, Dict, Any, Optional
from datetime import datetime
import os

from google.cloud import firestore


class Store:
    def __init__(self, project_id: Optional[str] = None) -> None:
        self.db = firestore.Client(project=project_id) if project_id else firestore.Client()

    def save_analysis(self, doc: Dict[str, Any]) -> str:
        ref = self.db.collection("communityAnalysis").document()
        ref.set({
            **doc,
            "createdAt": firestore.SERVER_TIMESTAMP,
        })
        return ref.id

    def fetch_analysis(self, location: str, since: datetime) -> List[Dict[str, Any]]:
        q = (
            self.db.collection("communityAnalysis")
            .where("location", "==", location)
            .where("createdAt", ">=", since)
        )
        rows = []
        for d in q.stream():
            x = d.to_dict()
            rows.append(x)
        return rows

    def fetch_texts(self, location: str, since: datetime) -> List[str]:
        q = (
            self.db.collection("communityMessages")
            .where("location", "==", location)
            .where("createdAt", ">=", since)
        )
        out: List[str] = []
        for d in q.stream():
            x = d.to_dict()
            t = x.get("text")
            if t:
                out.append(t)
        return out

