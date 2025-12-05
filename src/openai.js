
const FUNCTION_URL =
  "https://us-central1-examenappweb2.cloudfunctions.net/validateAnswerAI";

export const analyzeResponse = async (question, answer, rule) => {
  console.log("Appel de l'IA via HTTP Function validateAnswerAI...");

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question, answer, rule }),
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur: ${response.status}`);
    }

    const data = await response.json();

    return {
      status: data.status || "À améliorer",
      points_positifs: data.points_positifs || [],
      points_a_ameliorer: data.points_a_ameliorer || [],
      suggestion:
        data.suggestion ||
        "Veuillez préciser davantage certains éléments du plan de cours.",
    };
  } catch (error) {
    console.error("Erreur appel fonction IA:", error);
    return {
      status: "Erreur Technique",
      points_positifs: [],
      points_a_ameliorer: [],
      suggestion:
        "Impossible de contacter le serveur de validation. Réessayez plus tard.",
    };
  }
};
