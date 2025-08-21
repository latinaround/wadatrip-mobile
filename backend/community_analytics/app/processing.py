from typing import List, Dict, Any
import os

try:
    from transformers import pipeline
    HAVE_HF = True
except Exception:
    HAVE_HF = False

try:
    from bertopic import BERTopic
    from sentence_transformers import SentenceTransformer
    HAVE_BERTOPIC = True
except Exception:
    HAVE_BERTOPIC = False


class Analyzer:
    def __init__(self, lang: str = "en") -> None:
        self.lang = lang
        self._sent = None
        self._topic_model = None
        self._emb = None

        if HAVE_HF:
            # Choose a multilingual sentiment if Spanish is needed; fallback to English
            model = "cardiffnlp/twitter-roberta-base-sentiment" if lang == "en" else "nlptown/bert-base-multilingual-uncased-sentiment"
            try:
                self._sent = pipeline("sentiment-analysis", model=model)
            except Exception:
                self._sent = pipeline("sentiment-analysis")

        if HAVE_BERTOPIC:
            try:
                self._emb = SentenceTransformer("all-MiniLM-L6-v2")
                self._topic_model = BERTopic(language=lang if lang in ("en", "multilingual") else "multilingual", verbose=False)
            except Exception:
                self._topic_model = None

    def sentiment(self, text: str) -> Dict[str, Any]:
        if not self._sent:
            # Heuristic fallback
            lower = text.lower()
            score = 0.5
            label = "neutral"
            if any(w in lower for w in ["amazing", "great", "awesome", "love"]):
                score, label = 0.9, "positive"
            elif any(w in lower for w in ["bad", "terrible", "hate", "awful"]):
                score, label = 0.1, "negative"
            return {"label": label, "score": score}
        out = self._sent(text)[0]
        # Normalize to {label, score}
        label = str(out.get("label", "neutral")).lower()
        score = float(out.get("score", 0.5))
        return {"label": label, "score": score}

    def topics_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        if not texts:
            return []
        if not self._topic_model or not self._emb:
            # Fallback: extract naive keywords
            res = []
            for t in texts:
                words = [w.strip(".,!?:;()[]{}\"' ") for w in t.lower().split()]
                kept = [w for w in words if len(w) > 4][:3]
                res.append({"labels": kept})
            return res
        topics, _ = self._topic_model.fit_transform(texts, embeddings=self._emb.encode(texts))
        # Map topic IDs to representative labels
        labels = self._topic_model.generate_topic_labels(nr_words=3)
        id2label = {idx: lab for idx, lab in enumerate(labels)}
        out: List[Dict[str, Any]] = []
        for tid in topics:
            lab = id2label.get(tid, "topic")
            out.append({"topic": int(tid), "labels": [lab]})
        return out

