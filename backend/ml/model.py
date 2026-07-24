import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

MODEL_PATH = os.path.join(os.path.dirname(__file__), "wafeai_model.pkl")

# Mapa de tipos de crédito a número
TIPO_CREDITO_MAP = {
    "microcredito": 0,
    "consumo": 1,
    "vivienda": 2,
    "empresarial": 3,
}


class WafeAIPredictor:
    """Modelo de predicción de riesgo de cartera vencida para WafeAI."""

    def __init__(self):
        self.model: Pipeline | None = None
        self._cargar_modelo()

    def _cargar_modelo(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception:
                self.model = None

    def entrenar(self, datos: list[dict]) -> dict:
        """Entrena el modelo con datos históricos de socios."""
        df = pd.DataFrame(datos)
        X = df[["dias_mora", "monto_pendiente_mm", "ratio_cumplimiento",
                "num_creditos", "tipo_credito", "meses_cliente", "porcentaje_deuda"]]
        y = df["es_alto_riesgo"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(
                n_estimators=150,
                max_depth=4,
                learning_rate=0.1,
                random_state=42,
            )),
        ])

        pipeline.fit(X_train, y_train)
        self.model = pipeline
        joblib.dump(pipeline, MODEL_PATH)

        y_pred = pipeline.predict(X_test)
        report = classification_report(y_test, y_pred, output_dict=True)
        return {"accuracy": report["accuracy"], "reporte": report}

    def predecir(self, socio_data: dict) -> dict:
        """Predice el score de riesgo de un socio (0-100)."""
        if self.model is None:
            # Fallback basado en reglas si no hay modelo entrenado
            return self._prediccion_por_reglas(socio_data)

        tipo_encoded = TIPO_CREDITO_MAP.get(socio_data.get("tipo_credito", "consumo"), 1)
        features = np.array([[
            socio_data.get("dias_mora", 0),
            socio_data.get("monto_pendiente", 0) / 1_000_000,
            socio_data.get("ratio_cumplimiento", 1.0),
            socio_data.get("num_creditos", 1),
            tipo_encoded,
            socio_data.get("meses_cliente", 12),
            socio_data.get("porcentaje_deuda", 0.5),
        ]])

        proba = self.model.predict_proba(features)[0][1]
        score = round(float(proba) * 100, 1)
        nivel = self._calcular_nivel(score)

        return {
            "score_riesgo": score,
            "nivel_riesgo": nivel,
            "probabilidad_incumplimiento": round(float(proba), 4),
            "factores_riesgo": self._factores_riesgo(socio_data, score),
        }

    def _prediccion_por_reglas(self, data: dict) -> dict:
        """Predicción basada en reglas de negocio cuando no hay modelo."""
        score = 0.0
        dias_mora = data.get("dias_mora", 0)
        ratio = data.get("ratio_cumplimiento", 1.0)
        porcentaje_deuda = data.get("porcentaje_deuda", 0.5)
        num_creditos = data.get("num_creditos", 1)

        if dias_mora > 90:
            score += 50
        elif dias_mora > 30:
            score += 30
        elif dias_mora > 0:
            score += 15

        score += (1 - ratio) * 30
        score += porcentaje_deuda * 20

        # Señal predictiva: varios créditos simultáneos + alta concentración de
        # deuda + mal historial de pago = sobreendeudamiento detectable ANTES
        # de que aparezca la mora (el caso que vende la página de Predicción IA).
        if num_creditos >= 3 and porcentaje_deuda > 0.7 and ratio < 0.6:
            score += 40

        score = min(score, 99)

        nivel = self._calcular_nivel(score)
        return {
            "score_riesgo": round(score, 1),
            "nivel_riesgo": nivel,
            "probabilidad_incumplimiento": round(score / 100, 4),
            "factores_riesgo": self._factores_riesgo(data, score),
        }

    def _calcular_nivel(self, score: float) -> str:
        if score >= 70:
            return "alto"
        elif score >= 40:
            return "medio"
        return "bajo"

    def _factores_riesgo(self, data: dict, score: float) -> list[str]:
        factores = []
        if data.get("dias_mora", 0) > 30:
            factores.append(f"{data['dias_mora']} días en mora")
        if data.get("ratio_cumplimiento", 1) < 0.7:
            factores.append("Historial de pagos irregular")
        if data.get("porcentaje_deuda", 0) > 0.8:
            factores.append("Alta carga de deuda")
        if data.get("num_creditos", 1) >= 3:
            factores.append("Múltiples créditos activos")
        if (data.get("num_creditos", 1) >= 3 and data.get("porcentaje_deuda", 0) > 0.7
                and data.get("ratio_cumplimiento", 1) < 0.6):
            factores.append("Sobreendeudamiento: alta deuda concentrada en varios créditos")
        if not factores and score < 40:
            factores.append("Perfil de pago saludable")
        return factores


# Instancia global del predictor
predictor = WafeAIPredictor()
