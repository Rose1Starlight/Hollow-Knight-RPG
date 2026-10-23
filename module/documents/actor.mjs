/**
 * HollowKnightActor - Custom Actor document class
 * Handles derived attribute calculations and automation
 */
export class HollowKnightActor extends Actor {

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    const system = this.system;

    const size = system.details?.size || "average";
    const sizeData = {
      tiny: { might: 1, insight: 3, shell: 2, grace: 4, speed: 7, hunger: -2, heart: 5 },
      small: { might: 2, insight: 3, shell: 3, grace: 4, speed: 7, hunger: -1, heart: 6 },
      average: { might: 3, insight: 3, shell: 3, grace: 3, speed: 6, hunger: 4, heart: 7 },
      large: { might: 4, insight: 3, shell: 4, grace: 2, speed: 5, hunger: 9, heart: 8 }
    };
    const base = sizeData[size] || sizeData.average;

    system.attributes.might.value = base.might + (system.attributes.might.bonus || 0);
    system.attributes.insight.value = base.insight + (system.attributes.insight.bonus || 0);
    system.attributes.shell.value = base.shell + (system.attributes.shell.bonus || 0);
    system.attributes.grace.value = base.grace + (system.attributes.grace.bonus || 0);

    system.secondaryAttributes.speed.value = base.speed + (system.secondaryAttributes.speed.bonus || 0);
    system.secondaryAttributes.absorption.value = (system.secondaryAttributes.absorption.bonus || 0);
    
    system.secondaryAttributes.cute.value = (system.secondaryAttributes.cute.sizeAllocation || 0) + (system.secondaryAttributes.cute.bonus || 0);
    system.secondaryAttributes.spook.value = (system.secondaryAttributes.spook.sizeAllocation || 0) + (system.secondaryAttributes.spook.bonus || 0);

    system.details.hunger.value = base.hunger + (system.details.hunger.bonus || 0);
    system.pools.heart.max = base.heart + (system.pools.heart.bonus || 0);
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    this._applyItemModifiers();
    this._calculatePoolMaximums();
    this._calculateNotchUsage();
    this._updateConditions();

    const sys = this.system;
    ['might', 'insight', 'shell', 'grace'].forEach(attr => {
      sys.attributes[attr].value = Math.min(7, Math.max(0, sys.attributes[attr].value));
    });
    sys.pools.heart.max = Math.max(1, sys.pools.heart.max);
  }

  _calculatePoolMaximums() {
    const system = this.system;
    if (!system.pools) return;

    let staminaBonus = 0;
    let soulBonus = 0;
    let totalPathRanks = 0;
    let customStashBonus = 0;
    let customHeartBonus = 0;

    const pathItems = this.items.filter(i => i.type === "path");
    
    for (const pathItem of pathItems) {
      const rank = parseInt(pathItem.system?.rank) || 1;
      totalPathRanks += rank; 
      
      if (pathItem.system?.pathType === "martial") {
        staminaBonus += rank;
      } else if (pathItem.system?.pathType === "mystic") {
        soulBonus += rank;
      }

      const bonusType = pathItem.system?.customBonusType;
      const bonusVal = parseFloat(pathItem.system?.customBonusValue) || 1;
      const totalBonus = bonusVal * rank;

      if (bonusType === "stash") {
        customStashBonus += totalBonus;
      } else if (bonusType === "heart") {
        customHeartBonus += totalBonus;
      } else if (bonusType === "might") {
        system.attributes.might.value += totalBonus;
      } else if (bonusType === "insight") {
        system.attributes.insight.value += totalBonus;
      } else if (bonusType === "shell") {
        system.attributes.shell.value += totalBonus;
      } else if (bonusType === "grace") {
        system.attributes.grace.value += totalBonus;
      } else if (bonusType === "cute") {
        system.secondaryAttributes.cute.value += totalBonus;
      } else if (bonusType === "spook") {
        system.secondaryAttributes.spook.value += totalBonus;
      } else if (bonusType === "speed") {
        system.secondaryAttributes.speed.value += totalBonus;
      } else if (bonusType === "absorption") {
        system.secondaryAttributes.absorption.value += totalBonus;
      }
    }

    system.pools.stamina.max = 3 + staminaBonus;
    system.pools.soul.max = 3 + soulBonus;
    system.pools.heart.max += customHeartBonus;
    
    if (system.secondaryAttributes && system.secondaryAttributes.notches) {
      system.secondaryAttributes.notches.value = 3 + totalPathRanks;
    }

    const baseStash = Math.ceil((system.attributes.insight.value || 0) / 2);
    const hasStashSource = pathItems.some(item => 
      item.system?.bonusPool === "stash" || item.system?.customBonusType === "stash"
    );

    if (hasStashSource || customStashBonus > 0) {
      system.pools.stash.max = baseStash + customStashBonus;
    }
  }

  _applyItemModifiers() {
    const system = this.system;
    
    for (const item of this.items) {
      if (item.type === "trait" || (item.type === "charm" && item.system.equipped) || (item.type === "armor" && item.system.equipped)) {
        
        if (item.type === "trait" && item.system.hungerCost) {
          system.details.hunger.value += item.system.hungerCost;
        }

        if (item.system.lifebloodHeartsBonus) {
            system.gloryPools.lifebloodHearts.value = (system.gloryPools.lifebloodHearts.value || 0) + item.system.lifebloodHeartsBonus;
        }
        if (item.system.gloryStaminaBonus) {
            system.gloryPools.gloryStamina.value = (system.gloryPools.gloryStamina.value || 0) + item.system.gloryStaminaBonus;
        }
        if (item.system.glorySoulBonus) {
            system.gloryPools.glorySoul.value = (system.gloryPools.glorySoul.value || 0) + item.system.glorySoulBonus;
        }
        if (item.system.gloryStashBonus) {
            system.gloryPools.gloryStash.value = (system.gloryPools.gloryStash.value || 0) + item.system.gloryStashBonus;
        }

        const text = `${item.system.effect || ""} ${item.system.description || ""}`;
        let match;
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Speed/i);
        if (match) system.secondaryAttributes.speed.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Cute/i);
        if (match) system.secondaryAttributes.cute.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Spook/i);
        if (match) system.secondaryAttributes.spook.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Might/i);
        if (match) system.attributes.might.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Insight/i);
        if (match) system.attributes.insight.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Shell/i);
        if (match) system.attributes.shell.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Grace/i);
        if (match) system.attributes.grace.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+)\s+(?:Max\s+)?Heart/i);
        if (match) system.pools.heart.max += parseInt(match[1]);
        
        match = text.match(/([+-]\d+(?:\.\d+)?)\s+Hunger/i);
        if (match) system.details.hunger.value += parseFloat(match[1]);
        
        match = text.match(/([+-]\d+)\s+Absorption/i) || text.match(/Absorption\s+(?:of\s+)?([+-]?\d+)/i);
        if (match) system.secondaryAttributes.absorption.value += parseInt(match[1]);
      }
    }

    system.secondaryAttributes.footwork.value = Math.ceil((system.attributes.grace.value || 0) / 2);
    system.secondaryAttributes.load.value = Math.floor(system.attributes.might.value || 0);
    system.secondaryAttributes.beltSize.value = Math.floor(system.attributes.shell.value || 0);
    system.secondaryAttributes.techniqueSlots.value = Math.floor(system.attributes.insight.value || 0);
  }

  _calculateNotchUsage() {
    const system = this.system;
    const charms = this.items.filter(i => i.type === "charm" && i.system.equipped);
    let usedNotches = 0;
    for (const charm of charms) {
      usedNotches += charm.system.notchCost || 1;
    }
    system.notchesUsed = usedNotches;
    system.isOvercharmed = usedNotches > (system.secondaryAttributes.notches?.value || 3);
  }

  _updateConditions() {
    const system = this.system;
    if (system.pools.heart.value <= 0 && !system.conditions.atDeathsDoor) {
      system.conditions.atDeathsDoor = true;
    }
    if (system.conditions.atDeathsDoor && system.pools.stamina.value <= 0) {
      system.conditions.isDead = true;
    }
  }

  async rollAttributeCheck(attribute, options = {}) {
    const system = this.system;
    
    let attrValue = system.attributes[attribute]?.value;
    if (attrValue === undefined) {
      attrValue = system.secondaryAttributes[attribute]?.value || 0;
    }

    const skillRank = options.skillRank ?? 0;
    const bonusDice = options.bonusDice ?? 0;
    const targetDie = options.targetDie ?? 5;
    const targetSuccesses = options.targetSuccesses ?? 1;
    const rerolls = options.rerolls ?? (attrValue % 1 >= 0.5 ? 1 : 0);

    const diceCount = Math.max(1, Math.floor(attrValue) + skillRank + bonusDice);

    const roll = await new Roll(`${diceCount}d6`).evaluate();
    const rolledSuccesses = roll.terms[0].results.filter(r => r.result >= targetDie).length;

    let finalSuccesses = rolledSuccesses;
    if (rerolls > 0) {
      const failedDice = roll.terms[0].results.filter(r => r.result < targetDie);
      const rerollCount = Math.min(rerolls, failedDice.length);

      if (rerollCount > 0) {
        const reroll = await new Roll(`${rerollCount}d6`).evaluate();
        const rerollSuccesses = reroll.terms[0].results.filter(r => r.result >= targetDie).length;
        finalSuccesses = rolledSuccesses + rerollSuccesses;
      }
    }

    const isSuccess = finalSuccesses >= targetSuccesses;
    const resultText = isSuccess ? "SUCCESS!" : "FAILURE!";
    const resultColor = isSuccess ? "var(--hk-accent-green)" : "var(--hk-accent-red)";

    const attrName = attribute.charAt(0).toUpperCase() + attribute.slice(1);
    const titleName = options.skillName ? `${options.skillName} (${attrName})` : `${attrName} Check`;

    const flavor = `
      <div class="hk-roll-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
        <h3 style="margin-top:0; border-bottom:1px solid var(--hk-border-light); padding-bottom:5px; color:var(--hk-accent-blue);">${titleName}</h3>
        <div class="roll-details" style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--hk-text-secondary); margin-bottom:10px;">
          <span>Dice: <strong>${diceCount}d6</strong></span>
          <span>Target: <strong>${targetDie}+</strong></span>
          <span>Goal: <strong>${targetSuccesses}</strong></span>
        </div>
        <div style="text-align: center; margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--hk-border);">
          <span style="font-size: 1.2rem;">Successes: <strong style="color:var(--hk-accent-gold); font-size:1.4rem;">${finalSuccesses}</strong></span>
        </div>
        <h4 style="text-align:center; margin: 0; padding-top:5px; color: ${resultColor}; font-size: 1.2rem; font-family:var(--hk-font-header);">
          ${resultText}
        </h4>
        <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
            <button class="chat-apply-heal" title="Apply Heal" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-green); color:#1a1c23; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-heart"></i></button>
            <button class="chat-apply-damage" data-damage="${finalSuccesses}" title="Apply Damage" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-red); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-skull"></i></button>
            <button class="chat-apply-dot" title="Apply DoT" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-purple); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-burn"></i></button>
        </div>
      </div>
    `;

    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: flavor });
    return finalSuccesses;
  }

  async applyDamage(amount, options = {}) {
    const system = this.system;
    let damage = amount;
    let summary = [];
    
    summary.push(`Incoming Damage: <strong>${amount}</strong> (${options.damageType || "physical"})`);

    const isBypassDR = options.ignoreDR || ["magic", "environmental", "stamina", "soul"].includes(options.damageType);

    if (!isBypassDR) {
        const dr = this._getTotalDR();
        if (dr > 0) {
            damage = Math.max(1, damage - dr);
            summary.push(`Armor DR: <strong>-${dr}</strong> (Remaining: ${damage})`);
        }
    } else if (["magic", "environmental"].includes(options.damageType)) {
        summary.push(`<em>Armor DR bypassed by damage type.</em>`);
    }

    let soakSuccesses = 0;
    let soakRoll = null;
    const isBypassSoak = options.bypassSoak || ["magic", "environmental", "stamina", "soul"].includes(options.damageType);

    if (!isBypassSoak) {
        const soakAttr = options.soakAttribute || "shell";
        let attrValue = system.attributes[soakAttr]?.value;
        if (attrValue === undefined) attrValue = system.secondaryAttributes[soakAttr]?.value || 0;

        const soakDice = Math.max(0, Math.floor(attrValue) + (options.bonusSoakDice || 0));
        if (soakDice > 0) {
            soakRoll = await new Roll(`${soakDice}d6`).evaluate();
            soakSuccesses = soakRoll.terms[0].results.filter(r => r.result >= 5).length;
            damage = Math.max(0, damage - soakSuccesses);
            summary.push(`Soak Roll (${soakAttr.toUpperCase()}): <strong>-${soakSuccesses}</strong> (Remaining: ${damage})`);
        }
    } else {
        summary.push(`<em>Soak bypassed by damage type.</em>`);
    }

    const totalAbsorption = (system.secondaryAttributes.absorption?.value || 0) + (options.bonusAbsorption || 0);
    if (totalAbsorption > 0 && damage > 0 && !["stamina", "soul"].includes(options.damageType)) {
        damage = 1 + Math.floor(damage / totalAbsorption);
        summary.push(`Absorption applied: Damage reduced to <strong>${damage}</strong>`);
    }

    if (options.damageType === "stamina") {
        await this.update({ "system.pools.stamina.value": Math.max(0, system.pools.stamina.value - damage) });
    } else if (options.damageType === "soul") {
        await this.update({ "system.pools.soul.value": Math.max(0, system.pools.soul.value - damage) });
    } else {
        if (system.gloryPools?.lifebloodHearts?.value > 0) {
            const lbDamage = Math.min(system.gloryPools.lifebloodHearts.value, damage);
            await this.update({ "system.gloryPools.lifebloodHearts.value": system.gloryPools.lifebloodHearts.value - lbDamage });
            damage -= lbDamage;
            summary.push(`Lifeblood Hearts lost: <strong>${lbDamage}</strong>`);
        }
        if (damage > 0) {
            const newHeart = Math.max(0, system.pools.heart.value - damage);
            await this.update({ "system.pools.heart.value": newHeart });
            
            if (newHeart <= 0 && !system.conditions.atDeathsDoor) {
                await this.update({ "system.conditions.atDeathsDoor": true });
                summary.push(`<strong style="color:var(--hk-accent-red);">AT DEATH'S DOOR!</strong>`);
            }
        }
    }

    const flavor = `
      <div class="hk-damage-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
        <h3 style="margin-top:0; border-bottom:1px solid var(--hk-accent-red); padding-bottom:5px; color:var(--hk-accent-red);">Damage Applied</h3>
        <ul style="padding-left: 20px; font-size: 0.9rem; color:var(--hk-text-secondary); margin-bottom:10px;">
            <li>${summary.join("</li><li>")}</li>
        </ul>
        <div style="text-align: center; margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--hk-accent-red);">
          <span style="font-size: 1.2rem;">Final Damage: <strong style="color:var(--hk-accent-red); font-size:1.4rem;">${damage}</strong></span>
        </div>
      </div>
    `;

    if (soakRoll) {
        await soakRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: flavor });
    } else {
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: flavor });
    }
    return damage;
  }

  _getTotalDR() {
    let dr = 0;
    const armor = this.items.find(i => i.type === "armor" && i.system.equipped);
    if (armor) dr += armor.system.damageReduction || 0;
    const traits = this.items.filter(i => i.type === "trait");
    for (const trait of traits) {
      if (trait.system.effect?.includes("Damage Reduction")) {
        const match = trait.system.effect.match(/\+(\d+)\s*DR/i);
        if (match) dr += parseInt(match[1]);
      }
    }
    return dr;
  }

  async heal(amount, pool = "heart") {
    const system = this.system;
    const poolData = system.pools[pool];
    if (!poolData) return;

    const newValue = Math.min(poolData.max, poolData.value + amount);
    const actualHeal = newValue - poolData.value;
    
    await this.update({ [`system.pools.${pool}.value`]: newValue });

    if (pool === "heart" && newValue > 0 && system.conditions.atDeathsDoor) {
        await this.update({ "system.conditions.atDeathsDoor": false });
    }

    const poolNames = { heart: "Hearts", stamina: "Stamina", soul: "Soul", belly: "Belly" };
    const flavor = `
      <div class="hk-heal-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
        <h3 style="margin-top:0; border-bottom:1px solid var(--hk-accent-green); padding-bottom:5px; color:var(--hk-accent-green);">Recovery</h3>
        <div style="text-align: center; margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--hk-accent-green);">
          <span style="font-size: 1.2rem;">Restored: <strong style="color:var(--hk-accent-green); font-size:1.4rem;">${actualHeal} ${poolNames[pool]}</strong></span>
        </div>
      </div>
    `;
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: flavor });
  }

  async rest(options = {}) {
    const system = this.system;
    const updates = {};

    if (options.slept) {
      updates["system.pools.soul.value"] = system.pools.soul.max;
      updates["system.pools.heart.value"] = Math.min(system.pools.heart.max, system.pools.heart.value + 1);
    }
    updates["system.pools.stamina.value"] = system.pools.stamina.max;

    const hungerLoss = Math.max(system.details.hunger.value, 10);
    updates["system.pools.belly.value"] = Math.max(-100, system.pools.belly.value - hungerLoss);
    updates["system.conditions.atDeathsDoor"] = false;
    updates["system.conditions.offBalance.value"] = 0;
    updates["system.conditions.statusEffects"] = [];
    updates["system.conditions.dots"] = [];

    updates["system.gloryPools.lifebloodHearts.value"] = 0;
    updates["system.gloryPools.gloryStamina.value"] = 0;
    updates["system.gloryPools.glorySoul.value"] = 0;
    updates["system.gloryPools.gloryStash.value"] = 0;
    updates["system.gloryPools.gloryPluck.value"] = 0;

    await this.update(updates);

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="hk-rest-message"><strong>${this.name}</strong> rests.${options.slept ? " Slept and recovered Soul." : ""}</div>`
    });
  }
}