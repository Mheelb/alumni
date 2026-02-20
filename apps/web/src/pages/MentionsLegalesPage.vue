<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { AlertCircle } from 'lucide-vue-next'
</script>

<template>
  <div class="container py-12 max-w-4xl space-y-8">
    <!-- Disclaimer -->
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-800">
      <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p class="font-bold text-lg uppercase tracking-tight">Attention : Mentions non-officielles</p>
        <p class="text-sm">
          Les informations présentées sur cette page sont fictives et fournies à titre d'exemple dans le cadre du développement technique de la plateforme. Elles ne constituent en aucun cas des mentions légales réelles ou valides juridiquement.
        </p>
      </div>
    </div>

    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Mentions Légales</h1>
      
      <section class="space-y-3">
        <h2 class="text-xl font-semibold">1. Présentation du site</h2>
        <p class="text-muted-foreground leading-relaxed">
          Le présent site est une plateforme de gestion du réseau des diplômés (Alumni) de l'école My Digital School. 
          Il a pour but de faciliter la mise en relation, le suivi de carrière et l'animation de la communauté des anciens élèves.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">2. Éditeur du site</h2>
        <p class="text-muted-foreground leading-relaxed">
          Le site est édité par l'administration de l'école My Digital School.<br />
          Adresse : [Adresse fictive de l'école]<br />
          Email : contact@mydigitalschool.fr
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">3. Hébergement</h2>
        <p class="text-muted-foreground leading-relaxed">
          Le site est hébergé sur des serveurs locaux à des fins de démonstration technique.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">4. Propriété intellectuelle</h2>
        <p class="text-muted-foreground leading-relaxed">
          Tous les contenus présents sur le site (logos, textes, graphismes) sont la propriété de leurs auteurs respectifs. 
          Le logo My Digital School est une marque déposée.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">5. Protection des données personnelles (RGPD)</h2>
        <p class="text-muted-foreground leading-relaxed">
          Conformément à la loi, les utilisateurs disposent d'un droit d'accès, de rectification et de suppression des données les concernant. 
          Les données collectées (nom, prénom, promotion, parcours pro) ne sont utilisées que pour le fonctionnement interne de l'annuaire.
        </p>
      </section>
    </div>
  </div>
</template>
