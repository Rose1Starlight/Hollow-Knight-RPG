/**
 * ConsumableSheet - Item sheet for Consumables (Food, Potions, Flasks, Traps, etc)
 */
export class ConsumableSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "consumable"],
      template: "systems/hollow-knight-rpg/templates/items/consumable-sheet.hbs",
      width: 550,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    
    // Liga os dados do sistema e aplica permissões explícitas de edição
    context.system = this.item.system;
    context.flags = this.item.flags;
    context.owner = this.item.isOwner;
    context.editable = this.isEditable;

    const enrichOpts = { async: true, secrets: this.item.isOwner };
    context.enrichedDescription = await TextEditor.enrichHTML(this.item.system.description || "", enrichOpts);

    return context;
  }
}