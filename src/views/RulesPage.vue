<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Spelregels</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Doel van het spel</h2>
      <p>Speel al je kaarten weg. De laatste speler met kaarten is de verliezer (Shithead).</p>

      <h2>Opzet</h2>
      <p>Elke speler krijgt:</p>
      <ul>
        <li>4 gesloten kaarten (face-down)</li>
        <li>4 open kaarten bovenop de gesloten kaarten</li>
        <li>4 handkaarten</li>
      </ul>

      <h2>Spelverloop</h2>
      <p>Spelers leggen om de beurt een of meerdere kaarten van dezelfde waarde op de aflegstapel. De gespeelde kaart moet gelijk of hoger zijn dan de bovenste kaart.</p>
      <p>Na elke beurt vul je je hand aan tot 4 kaarten uit de trekstapel.</p>
      <p>Kun je niet spelen? Dan moet je de hele aflegstapel in je hand nemen.</p>

      <h2>Speciale kaarten</h2>
      <ion-list>
        <ion-item>
          <ion-label>
            <h3>2 - Reset</h3>
            <p>Mag overal op gespeeld worden. De volgende kaart mag weer alles zijn.</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>3 - Glas</h3>
            <p>Mag overal op gespeeld worden. De volgende speler moet de kaart onder de 3 verslaan. Je ziet de onderliggende kaart door het glas heen.</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>7 - Plafond</h3>
            <p>Mag alleen op 7 of lager. De volgende kaart moet ook 7 of lager zijn.</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>10 - Brand</h3>
            <p>Verbrandt de hele aflegstapel. Deze kaarten doen niet meer mee.</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>Boer - Omkeren</h3>
            <p>Draait de speelrichting om. De volgende speler is nu degene die normaal voor je zat.</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <h2>Verbranden</h2>
      <p>De aflegstapel wordt verbrand (verwijderd uit het spel) wanneer:</p>
      <ul>
        <li>Een 10 wordt gespeeld</li>
        <li>4 kaarten van dezelfde waarde op elkaar liggen</li>
        <li>4 kaarten van dezelfde waarde met 3'en ertussen (bijv. 4-4-3-4-4)</li>
      </ul>
      <p><em>Let op: dit werkt niet met 3'en zelf - 3-3-3-4-3 brandt niet!</em></p>

      <h2>Eindfase</h2>
      <ol>
        <li><strong>Handfase:</strong> Speel uit je hand, vul aan uit de trekstapel</li>
        <li><strong>Open kaarten:</strong> Als de trekstapel en je hand leeg zijn, speel je open kaarten</li>
        <li><strong>Gesloten kaarten:</strong> Speel blind - kies een kaart zonder te kijken</li>
      </ol>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel } from '@ionic/vue';
</script>

<style scoped>
h2 {
  margin-top: 1.5rem;
  color: var(--ion-color-primary);
}

ul, ol {
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
}

ion-item h3 {
  font-weight: bold;
}
</style>
