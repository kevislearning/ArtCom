import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HF_TOKEN);

const data = fs.readFileSync("cats.jpg");

const output = await client.imageClassification({
	data,
	model: "umm-maybe/AI-image-detector:fastest",
	provider: "auto",
});

console.log(output);