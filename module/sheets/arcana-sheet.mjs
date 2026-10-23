/**
 * ArcanaSheet - Item sheet for Arcana (spells)
 */
export class ArcanaSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "arcana"],
      template: "systems/hollow-knight-rpg/templates/items/arcana-sheet.hbs",
      width: 560,
      height: 520
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.item.system;
    return context;
  }
}