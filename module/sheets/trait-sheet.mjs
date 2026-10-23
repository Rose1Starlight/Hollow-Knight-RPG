/**
 * TraitSheet - Item sheet for Traits
 */
export class TraitSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "trait"],
      template: "systems/hollow-knight-rpg/templates/items/trait-sheet.hbs",
      width: 560,
      height: 480
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.item.system;
    return context;
  }
}