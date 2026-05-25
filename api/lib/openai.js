import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a social media post for a given niche and subject.
 */
export async function generatePost({ niche, subject, tone }) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `Tu es un community manager expert dans la niche ${niche}.`,
      },
      {
        role: "user",
        content: `Rédige une publication captivante et professionnelle sur le sujet : ${subject}.
Ton attendu : ${tone || "professionnel et engageant"}.
Ajoute 3 hashtags pertinents à la fin.
Sois concis (max 280 caractères hors hashtags).
Format : texte du post, puis hashtags sur une nouvelle ligne.`,
      },
    ],
  });
  return completion.choices[0].message.content.trim();
}

/**
 * Moderate a comment. Returns { action: "block"|"reply", response?: string }
 */
export async function moderateComment({ message, moderationRules }) {
  const extra = moderationRules
    ? `\nRègles supplémentaires de la marque :\n${moderationRules}`
    : "";

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Tu es un modérateur IA professionnel et bienveillant.
Analyse le commentaire suivant : "${message}"

Règle 1 : Si le message contient des insultes, propos haineux, spam ou contenu offensant, réponds UNIQUEMENT par le mot : BLOQUER
Règle 2 : Si le message est une question, compliment ou message neutre, rédige une réponse professionnelle, chaleureuse et concise en représentant de la marque. N'invente pas d'informations.${extra}`,
      },
    ],
  });

  const text = completion.choices[0].message.content.trim();
  if (text.toUpperCase() === "BLOQUER") {
    return { action: "block" };
  }
  return { action: "reply", response: text };
}
