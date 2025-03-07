import { DiscordField } from "./types";

export const EmptyInline: DiscordField = {
  name: "\u200b",
  value: "\u200b",
  inline: true,
};

export function groupInlineFields(fields: DiscordField[]) {
  // pad with empty inline fields to achieve 3 per row
  switch (fields.length % 3) {
    case 1:
      return [...fields, EmptyInline, EmptyInline];
    case 2:
      return [...fields, EmptyInline];
    default:
      return fields;
  }
}
