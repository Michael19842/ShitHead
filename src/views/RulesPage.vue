<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="rules-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" color="light"></ion-back-button>
        </ion-buttons>
        <ion-title>Spelregels</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rules-content">
      <div class="rules-container">
        <!-- Header -->
        <div class="rules-header">
          <div class="header-icon">📖</div>
          <h1>Hoe speel je Shithead?</h1>
          <p>Leer de regels en versla je tegenstanders!</p>
        </div>

        <!-- Goal section -->
        <div class="rule-card highlight">
          <div class="card-header">
            <span class="card-icon">🎯</span>
            <h2>Doel van het spel</h2>
          </div>
          <p class="goal-text">Speel al je kaarten weg. De laatste speler met kaarten is de verliezer - de <strong>Shithead</strong>! 💩
          </p>
        </div>

        <!-- Setup section -->
        <div class="rule-card">
          <div class="card-header">
            <span class="card-icon">🃏</span>
            <h2>Opzet</h2>
          </div>
          <p>Elke speler krijgt:</p>
          <div class="setup-items">
            <div class="setup-item">
              <div class="setup-visual facedown">
                <span>?</span><span>?</span><span>?</span><span>?</span>
              </div>
              <span>4 gesloten kaarten</span>
            </div>
            <div class="setup-item">
              <div class="setup-visual faceup">
                <span>♠</span><span>♥</span><span>♣</span><span>♦</span>
              </div>
              <span>4 open kaarten (bovenop)</span>
            </div>
            <div class="setup-item">
              <div class="setup-visual hand">
                <span>🎴</span><span>🎴</span><span>🎴</span><span>🎴</span>
              </div>
              <span>4 handkaarten</span>
            </div>
          </div>
        </div>

        <!-- Gameplay section -->
        <div class="rule-card">
          <div class="card-header">
            <span class="card-icon">🔄</span>
            <h2>Spelverloop</h2>
          </div>
          <div class="rule-list">
            <div class="rule-item">
              <span class="rule-number">1</span>
              <p>Speel een of meerdere kaarten van dezelfde waarde op de aflegstapel</p>
            </div>
            <div class="rule-item">
              <span class="rule-number">2</span>
              <p>De kaart moet <strong>gelijk of hoger</strong> zijn dan de bovenste kaart</p>
            </div>
            <div class="rule-item">
              <span class="rule-number">3</span>
              <p>Vul je hand aan tot 4 kaarten uit de trekstapel</p>
            </div>
            <div class="rule-item warning">
              <span class="rule-icon">⚠️</span>
              <p>Kun je niet spelen? Dan moet je de hele aflegstapel pakken!</p>
            </div>
          </div>
        </div>

        <!-- Special cards section -->
        <div class="rule-card special-cards">
          <div class="card-header">
            <span class="card-icon">✨</span>
            <h2>Speciale kaarten</h2>
          </div>

          <div class="special-card-list">
            <div class="special-card">
              <div class="special-rank two">2</div>
              <div class="special-info">
                <h3>Reset</h3>
                <p>Mag overal op gespeeld worden. De volgende kaart mag weer alles zijn.</p>
              </div>
            </div>

            <div class="special-card">
              <div class="special-rank three">3</div>
              <div class="special-info">
                <h3>Glas</h3>
                <p>Mag overal op. De volgende speler moet de kaart <em>onder</em> de 3 verslaan.</p>
              </div>
            </div>

            <div class="special-card">
              <div class="special-rank seven">7</div>
              <div class="special-info">
                <h3>Plafond</h3>
                <p>Mag alleen op 7 of lager. De volgende kaart moet ook 7 of lager zijn.</p>
              </div>
            </div>

            <div class="special-card">
              <div class="special-rank ten">10</div>
              <div class="special-info">
                <h3>Brand 🔥</h3>
                <p>Verbrandt de hele aflegstapel. Deze kaarten doen niet meer mee!</p>
              </div>
            </div>

            <div class="special-card">
              <div class="special-rank jack">B</div>
              <div class="special-info">
                <h3>Omkeren</h3>
                <p>Draait de speelrichting om. De volgende speler is nu degene die voor je zat.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Burn section -->
        <div class="rule-card burn">
          <div class="card-header">
            <span class="card-icon">🔥</span>
            <h2>Verbranden</h2>
          </div>
          <p>De aflegstapel wordt verbrand wanneer:</p>
          <div class="burn-conditions">
            <div class="burn-item">
              <span class="burn-icon">🔟</span>
              <span>Een 10 wordt gespeeld</span>
            </div>
            <div class="burn-item">
              <span class="burn-icon">4️⃣</span>
              <span>4 kaarten van dezelfde waarde op elkaar liggen</span>
            </div>
            <div class="burn-item">
              <span class="burn-icon">🔍</span>
              <span>4 dezelfde waarde met 3'en ertussen (bijv. 4-4-3-4-4)</span>
            </div>
          </div>
          <div class="burn-warning">
            <span>⚠️</span>
            <p>Let op: 3'en branden zelf ook (3333 = 🔥) </p>
          </div>
        </div>

        <!-- End game section -->
        <div class="rule-card endgame">
          <div class="card-header">
            <span class="card-icon">🏁</span>
            <h2>Eindfase</h2>
          </div>
          <div class="phase-list">
            <div class="phase-item">
              <div class="phase-number">1</div>
              <div class="phase-content">
                <h4>Handfase</h4>
                <p>Speel uit je hand, vul aan uit de trekstapel</p>
              </div>
            </div>
            <div class="phase-item">
              <div class="phase-number">2</div>
              <div class="phase-content">
                <h4>Open kaarten</h4>
                <p>Als de trekstapel en je hand leeg zijn, speel je open kaarten</p>
              </div>
            </div>
            <div class="phase-item">
              <div class="phase-number">3</div>
              <div class="phase-content">
                <h4>Gesloten kaarten</h4>
                <p>Speel blind - kies een kaart zonder te kijken! 🙈</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer tip -->
        <div class="rules-footer">
          <span class="footer-icon">💡</span>
          <p>Tip: Bewaar je speciale kaarten voor moeilijke situaties!</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/vue';
</script>

<style scoped>
.rules-toolbar {
  --background: transparent;
  --color: white;
  --border-width: 0;
}

.rules-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.rules-container {
  padding: 16px;
  padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.rules-header {
  text-align: center;
  padding: 16px 0 8px;
}

.header-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.rules-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.rules-header p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

/* Rule cards */
.rule-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.rule-card.highlight {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(46, 125, 50, 0.2) 100%);
  border-color: rgba(76, 175, 80, 0.3);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 24px;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.rule-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.5;
}

.goal-text {
  font-size: 15px !important;
  text-align: left;
}

.goal-text strong {
  color: #ff6b6b;
}

/* Setup items */
.setup-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.setup-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setup-visual {
  display: flex;
  gap: 4px;
}

.setup-visual span {
  width: 24px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.setup-visual.facedown span {
  background: linear-gradient(135deg, #5c6bc0 0%, #3949ab 100%);
  color: white;
}

.setup-visual.faceup span {
  background: white;
  color: #333;
}

.setup-visual.faceup span:nth-child(2),
.setup-visual.faceup span:nth-child(4) {
  color: #c62828;
}

.setup-visual.hand span {
  background: rgba(255, 255, 255, 0.1);
  font-size: 16px;
}

.setup-item > span {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

/* Rule list */
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.rule-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  border-radius: 50%;
  color: white;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.rule-item p {
  margin: 0;
  padding-top: 2px;
}

.rule-item.warning {
  background: rgba(255, 152, 0, 0.15);
  border-radius: 8px;
  padding: 10px;
  margin-top: 4px;
}

.rule-icon {
  font-size: 20px;
  flex-shrink: 0;
}

/* Special cards */
.special-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.special-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.special-rank {
  width: 40px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
  font-size: 20px;
  font-weight: bold;
  color: #333;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.special-rank.two { color: #4caf50; }
.special-rank.three { color: #2196f3; }
.special-rank.seven { color: #ff9800; }
.special-rank.ten { color: #f44336; }
.special-rank.jack { color: #9c27b0; }

.special-info {
  flex: 1;
}

.special-info h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.special-info p {
  margin: 0;
  font-size: 13px;
}

/* Burn section */
.rule-card.burn {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(183, 28, 28, 0.15) 100%);
  border-color: rgba(244, 67, 54, 0.3);
}

.burn-conditions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.burn-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.burn-icon {
  font-size: 20px;
}

.burn-item span:last-child {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.burn-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 193, 7, 0.15);
  border-radius: 8px;
  margin-top: 8px;
}

.burn-warning span {
  font-size: 16px;
}

.burn-warning p {
  margin: 0;
  font-size: 13px;
}

/* End game phases */
.rule-card.endgame {
  background: linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(81, 45, 168, 0.15) 100%);
  border-color: rgba(103, 58, 183, 0.3);
}

.phase-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phase-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.phase-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #673ab7 0%, #512da8 100%);
  border-radius: 50%;
  color: white;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.phase-content h4 {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.phase-content p {
  margin: 0;
  font-size: 13px;
}

/* Footer */
.rules-footer {
  display: flex;
  align-items: left ;
  justify-content: left;
  gap: 8px;
  padding: 16px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.footer-icon {
  font-size: 20px;
}

.rules-footer p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-style: italic;
}
</style>
