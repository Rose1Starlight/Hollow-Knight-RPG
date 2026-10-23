export class TraitData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      hunger: new fields.NumberField({ required: true, initial: 1, integer: true }),
      category: new fields.StringField({ initial: "body" }),
      isSubtrait: new fields.BooleanField({ initial: false }),
      modifiers: new fields.SchemaField({
        might: new fields.NumberField({ initial: 0, step: 0.5 }),
        grace: new fields.NumberField({ initial: 0, step: 0.5 }),
        shell: new fields.NumberField({ initial: 0, step: 0.5 }),
        insight: new fields.NumberField({ initial: 0, step: 0.5 }),
        spook: new fields.NumberField({ initial: 0, step: 0.5 }),
        cute: new fields.NumberField({ initial: 0, step: 0.5 }),
        heart: new fields.NumberField({ initial: 0, integer: true }),
        speed: new fields.NumberField({ initial: 0, integer: true })
      }),
      description: new fields.HTMLField()
    };
  }
}   