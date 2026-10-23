/**
 * PathSheet - Item sheet for Paths
 */
export class PathSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "path"],
      template: "systems/hollow-knight-rpg/templates/items/path-sheet.hbs",
      width: 650,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    
    // Liga os dados do sistema e aplica permissões explícitas de edição (Obrigatório na V12/V14)
    context.system = this.item.system;
    context.flags = this.item.flags;
    context.owner = this.item.isOwner;
    context.editable = this.isEditable;

    const enrichOpts = { async: true, secrets: this.item.isOwner };
    context.enrichedDescription = await TextEditor.enrichHTML(this.item.system.description || "", enrichOpts);
    context.enrichedRank1 = await TextEditor.enrichHTML(this.item.system.rank1Ability || "", enrichOpts);
    context.enrichedRank2 = await TextEditor.enrichHTML(this.item.system.rank2Ability || "", enrichOpts);
    context.enrichedRank3 = await TextEditor.enrichHTML(this.item.system.rank3Ability || "", enrichOpts);

    return context;
  }
}