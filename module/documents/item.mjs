/**
 * HollowKnightItem - Custom Item document class
 */
export class HollowKnightItem extends Item {

  /** @override */
  prepareData() {
    super.prepareData();
    switch (this.type) {
      case "weapon": this._prepareWeaponData(); break;
      case "armor": this._prepareArmorData(); break;
      case "charm": this._prepareCharmData(); break;
      case "art": this._prepareArtData(); break;
      case "arcana": this._prepareArcanaData(); break;
    }
  }

  _prepareWeaponData() {
    const system = this.system;
    let qualityBonus = 0;
    switch (system.upgradeTier) {
      case "honed": qualityBonus = 1; break;
      case "channeled": qualityBonus = 2; break;
      case "coiled": qualityBonus = 3; break;
      case "pure": qualityBonus = 4; break;
    }
    system.effectiveQuality = (system.quality || 1) + qualityBonus;

    if (system.modifier === "heavy") {
      system.effectiveDamage = (system.damage || 3) + 1;
    } else if (system.modifier === "lightened") {
      system.effectiveDamage = Math.max(1, (system.damage || 3) - 1);
    } else {
      system.effectiveDamage = system.damage || 3;
    }
  }

  _prepareArmorData() {
    const system = this.system;
    system.isBroken = (system.currentDurability || 0) <= 0;
    system.effectiveDR = system.isBroken ? 0 : (system.damageReduction || 0);
  }

  _prepareCharmData() { this.system.notchCost = this.system.notchCost || 1; }
  _prepareArtData() { this.system.staminaCost = this.system.staminaCost || 1; }
  _prepareArcanaData() { this.system.soulCost = this.system.soulCost || this.system.difficulty || 1; }

  async roll(options = {}) {
    const actor = this.actor;
    if (!actor) return ui.notifications.warn("This item does not belong to any actor.");

    switch (this.type) {
      case "weapon": return this._rollAttack(options);
      case "arcana": return this._rollSpell(options);
      case "art": return this._rollArt(options);
      default: return this.toChat();
    }
  }

  async _rollAttack(options = {}) {
    const actor = this.actor;
    const system = this.system;

    const isRanged = system.range?.includes("range");
    const defaultAttr = isRanged ? "grace" : "might";

    const content = `
      <form>
          <p>Attack with <strong>${this.name}</strong></p>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Base Attribute</label>
              <select id="attack-attr" style="width:120px; text-align:center;">
                  <option value="might" ${defaultAttr === 'might' ? 'selected' : ''}>Might</option>
                  <option value="insight">Insight</option>
                  <option value="shell">Shell</option>
                  <option value="grace" ${defaultAttr === 'grace' ? 'selected' : ''}>Grace</option>
                  <option value="cute">Cute</option>
                  <option value="spook">Spook</option>
              </select>
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Dedicated Stamina (+Dice)</label>
              <input type="number" id="attack-stamina" value="1" min="0" style="width:120px; text-align:center;" />
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Bonus Dice (+d6)</label>
              <input type="number" id="attack-dice" value="0" style="width:120px; text-align:center;" />
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center;">
              <label>Target Die (Default 5+)</label>
              <input type="number" id="attack-target-die" value="5" min="2" max="6" style="width:120px; text-align:center;" />
          </div>
      </form>
    `;

    new Dialog({
      title: `Roll Attack`,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: "Attack",
          callback: async (html) => {
            const attr = html.find("#attack-attr").val();
            const staminaDedicated = parseInt(html.find("#attack-stamina").val()) || 0;
            const bonusDice = parseInt(html.find("#attack-dice").val()) || 0;
            const targetDie = parseInt(html.find("#attack-target-die").val()) || 5;

            // Consume Glory Stamina first, then normal Stamina
            if (staminaDedicated > 0) {
              const gloryStam = actor.system.gloryPools?.gloryStamina?.value || 0;
              const regStam = actor.system.pools?.stamina?.value || 0;

              if (gloryStam + regStam < staminaDedicated) {
                return ui.notifications.warn("Not enough Stamina!");
              }

              let updates = {};
              if (gloryStam >= staminaDedicated) {
                updates["system.gloryPools.gloryStamina.value"] = gloryStam - staminaDedicated;
              } else {
                updates["system.gloryPools.gloryStamina.value"] = 0;
                updates["system.pools.stamina.value"] = regStam - (staminaDedicated - gloryStam);
              }
              await actor.update(updates);
            }

            let attrValue = actor.system.attributes[attr]?.value;
            if (attrValue === undefined) attrValue = actor.system.secondaryAttributes[attr]?.value || 0;

            const quality = system.effectiveQuality || 1;
            const diceCount = Math.max(1, Math.floor(attrValue) + quality + staminaDedicated + bonusDice);

            const roll = await new Roll(`${diceCount}d6`).evaluate();
            const successes = roll.terms[0].results.filter(r => r.result >= targetDie).length;

            let damage = 0;
            if (successes > 0) {
              const baseDamage = system.effectiveDamage || 3;
              const rolloverCap = Math.max(baseDamage, staminaDedicated);
              const rollover = Math.min(successes - 1, rolloverCap);
              damage = baseDamage + rollover;
            }

            const attrName = attr.charAt(0).toUpperCase() + attr.slice(1);
            const flavor = `
              <div class="hk-attack-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
                <img src="${this.img}" width="36" height="36" style="border-radius:4px;float:left;margin-right:8px;">
                <h3 style="margin-top:0; border-bottom:1px solid var(--hk-border-light); padding-bottom:5px; color:var(--hk-accent-blue);">${this.name}</h3>
                <div class="roll-details" style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--hk-text-secondary); margin-bottom:10px; clear:both; padding-top:8px;">
                  <span>Attribute: ${attrName}</span>
                  <span>Dice: <strong>${diceCount}d6</strong></span>
                  <span>Target: <strong>${targetDie}+</strong></span>
                </div>
                <div style="text-align: center; margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--hk-border);">
                  <span style="font-size: 1.2rem;">Successes: <strong style="color:var(--hk-accent-gold); font-size:1.4rem;">${successes}</strong></span>
                </div>
                <h4 style="text-align:center; margin: 0; padding-top:5px; color: ${damage > 0 ? 'var(--hk-accent-red)' : 'var(--hk-text-muted)'}; font-size: 1.2rem; font-family:var(--hk-font-header);">
                  ${damage > 0 ? `Potential Damage: ${damage}` : 'Missed / Blocked'}
                </h4>
                <div class="item-description" style="margin-top:10px; font-size:0.85rem; border-top:1px solid var(--hk-border-light); padding-top:5px;">${system.description || ""}</div>
                
                <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
                    <button class="chat-apply-heal" title="Apply Heal" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-green); color:#1a1c23; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-heart"></i></button>
                    <button class="chat-apply-damage" data-damage="${damage || 0}" title="Apply Damage" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-red); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-skull"></i></button>
                    <button class="chat-apply-dot" title="Apply DoT" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-purple); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-burn"></i></button>
                </div>
              </div>
            `;

            await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: flavor });
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }

  async _rollSpell(options = {}) {
    const actor = this.actor;
    const system = this.system;
    const soulCost = system.soulCost || system.difficulty || 1;

    // Glory Soul Handling
    const glorySoul = actor.system.gloryPools?.glorySoul?.value || 0;
    const regSoul = actor.system.pools?.soul?.value || 0;

    if (glorySoul + regSoul < soulCost) {
        return ui.notifications.warn("Not enough Soul!");
    }

    let updates = {};
    if (glorySoul >= soulCost) {
        updates["system.gloryPools.glorySoul.value"] = glorySoul - soulCost;
    } else {
        updates["system.gloryPools.glorySoul.value"] = 0;
        updates["system.pools.soul.value"] = regSoul - (soulCost - glorySoul);
    }
    await actor.update(updates);

    const isTouch = system.range === "touch";
    const attribute = isTouch ? (options.useMight ? "might" : "insight") : (options.useGrace ? "grace" : "insight");
    const attrValue = actor.system.attributes[attribute]?.value || 3;
    const pathRank = actor.system.paths?.[system.path] || 0;
    const diceCount = Math.floor(attrValue) + pathRank;

    let successes = 1;
    let roll = null;
    if (options.target && !options.willingTarget) {
      roll = await new Roll(`${diceCount}d6`).evaluate();
      successes = roll.terms[0].results.filter(r => r.result >= 5).length;
    }

    const flavor = `
      <div class="hk-spell-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
        <img src="${this.img}" width="36" height="36" style="border-radius:4px;float:left;margin-right:8px;">
        <h3 style="margin-top:0; border-bottom:1px solid var(--hk-border-light); padding-bottom:5px; color:var(--hk-accent-purple);">${this.name}</h3>
        <div class="spell-info" style="clear:both; padding-top:8px;"><span>Diff: ${system.difficulty||1}</span> | <span>Cost: ${soulCost} Soul</span></div>
        ${roll ? `<div class="roll-details"><span>Successes: <strong>${successes}</strong></span></div>` : ""}
        <div class="item-description" style="margin-top:10px; font-size:0.85rem; border-top:1px solid var(--hk-border-light); padding-top:5px;">${system.effect || system.description || ""}</div>
        
        <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
            <button class="chat-apply-heal" title="Apply Heal" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-green); color:#1a1c23; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-heart"></i></button>
            <button class="chat-apply-damage" data-damage="0" title="Apply Damage" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-red); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-skull"></i></button>
            <button class="chat-apply-dot" title="Apply DoT" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-purple); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-burn"></i></button>
        </div>
      </div>
    `;

    if (roll) await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
    else ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: flavor });
    return { successes, soulCost };
  }

  async _rollArt(options = {}) {
    const actor = this.actor;
    const system = this.system;
    const staminaCost = system.staminaCost || 1;
    
    // Glory Stamina Handling
    const gloryStam = actor.system.gloryPools?.gloryStamina?.value || 0;
    const regStam = actor.system.pools?.stamina?.value || 0;

    if (gloryStam + regStam < staminaCost) {
      return ui.notifications.warn("Not enough Stamina!");
    }

    let updates = {};
    if (gloryStam >= staminaCost) {
      updates["system.gloryPools.gloryStamina.value"] = gloryStam - staminaCost;
    } else {
      updates["system.gloryPools.gloryStamina.value"] = 0;
      updates["system.pools.stamina.value"] = regStam - (staminaCost - gloryStam);
    }
    await actor.update(updates);

    const flavor = `
      <div class="hk-art-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
        <img src="${this.img}" width="36" height="36" style="border-radius:4px;float:left;margin-right:8px;">
        <h3 style="margin-top:0; border-bottom:1px solid var(--hk-border-light); padding-bottom:5px; color:var(--hk-stamina-color);">${this.name}</h3>
        <div class="art-info" style="clear:both; padding-top:8px;"><span>Cost: ${staminaCost} STA</span></div>
        <div class="item-description" style="margin-top:10px; font-size:0.85rem; border-top:1px solid var(--hk-border-light); padding-top:5px;">${system.effect || system.description || ""}</div>

        <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
            <button class="chat-apply-heal" title="Apply Heal" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-green); color:#1a1c23; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-heart"></i></button>
            <button class="chat-apply-damage" data-damage="0" title="Apply Damage" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-red); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-skull"></i></button>
            <button class="chat-apply-dot" title="Apply DoT" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-purple); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-burn"></i></button>
        </div>
      </div>
    `;
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: flavor });
    return true;
  }

  async toChat() {
    const flavor = `<div class="hk-item-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);"><img src="${this.img}" width="48" height="48" style="float:left;margin-right:10px;"><h3 style="margin-top:0; border-bottom:1px solid var(--hk-border-light); padding-bottom:5px; color:var(--hk-accent-blue);">${this.name}</h3><div class="item-description" style="clear:both; padding-top:8px;">${this.system.description || ""}</div></div>`;
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: flavor });
  }
}