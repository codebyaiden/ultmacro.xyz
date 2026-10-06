import { questions, surveyVersion } from "./poll-definition.mjs";
import { questions as originalQuestions } from "./poll-definition-v1.mjs";
// Published prompts and option meanings remain immutable for existing responses.
const definitions = {
  "um-feedback-v1": originalQuestions,
  [surveyVersion]: questions,
};
export const surveyVersions = Object.keys(definitions);
export function questionsFor(version = surveyVersion) {
  if (!Object.hasOwn(definitions, version))
    throw Object.assign(
      new Error("This survey version is no longer available."),
      { status: 409 },
    );
  return definitions[version];
}
