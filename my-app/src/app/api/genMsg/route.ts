import openai from "../../../../utils/openai";
import pc from "../../../../utils/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
async function queryIndex(query: string) {
  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPEN_AI_KEY!,
    model: "text-embedding-3-large",
  });

  const queryEmbedding = await embeddings.embedQuery(query);
  const index = pc.Index("ai-customer-support");
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: 8,
    includeMetadata: true,
  });

  return queryResponse;
}

export async function POST(request: Request) {
  try {
    const res = await request.json();
    const userMessage = res["message"];
    const taskType = res["taskType"];
    const language = res["language"];

    const pineconeQuery = await queryIndex(userMessage);

    let responseMessage = "";

    if (taskType === "creative_writing") {
      model = "gpt-4o-mini";
    } else if (taskType === "technical_documentation") {
      model = "gpt-4o-mini";
    } else if (taskType === "customer_support") {
      model = "gpt-4o-mini";
    } else if (taskType === "general_knowledge") {
      model = "gpt-4o-mini";
    }

    if (pineconeQuery && pineconeQuery.matches.length > 0) {
      const relevantInfo = pineconeQuery.matches
        .map((match) => match.metadata?.text)
        .join(" ");

      const apiResponse = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable assistant speaking ${language}. Use the provided context to help answer the user's question related to ${taskType}. Respond only in ${language}.`,
          },
          {
            role: "user",
            content: `Context: ${relevantInfo}\n\nUser Query: ${userMessage}`,
          },
        ],
        model: model,
      });

      responseMessage =
        apiResponse.choices[0]?.message?.content ||
        "I'm not sure how to respond to that.";
    } else {
      const apiResponse = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a highly capable and informative chatbot. When a user asks a question related to ${taskType}, your task is to provide the most accurate and concise response possible.`,
          },
          {
            role: "user",
            content: `User Query: "${userMessage}". Please provide a brief and accurate response.`,
          },
        ],
        model: model,
      });

      responseMessage =
        apiResponse.choices[0]?.message?.content ||
        "I'm not sure how to respond to that.";
    }

    return new Response(
      JSON.stringify({
        success: true,
        reason: "N/A",
        body: { message: responseMessage },
      }),
      { status: 201 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        reason: "Error generating response",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
