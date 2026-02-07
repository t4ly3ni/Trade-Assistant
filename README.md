# BVMT Intelligent Trading Assistant System

Système d'Assistant Intelligent de Trading pour la Bourse des Valeurs Mobilières de Tunis (BVMT)

## Vue d'Ensemble

Ce projet est un système complet d'aide à la décision de trading qui combine analyse prédictive, détection d'anomalies, analyse de sentiment et recommandations intelligentes pour offrir aux investisseurs tunisiens un compagnon de trading moderne et sécurisé.

## Fonctionnalités Principales

### 1. Prévision des Prix et de la Liquidité
- Prédiction des prix à court terme (1-5 jours) pour les valeurs BVMT
- Anticipation des périodes de liquidité
- Modèle LSTM avec score de confiance
- Visualisation des prévisions avec intervalles

### 2. Analyse de Sentiment de Marché
- Collecte et analyse automatique des actualités financières tunisiennes
- Classification du sentiment (positif/négatif/neutre)
- Support multilingue (français/arabe)
- Timeline de sentiment pour chaque valeur

### 3. Détection d'Anomalies
- Identification en temps réel des comportements suspects
- Détection de pics de volume anormaux
- Alertes de variations de prix inhabituelles
- Système de classification par sévérité (low/medium/high/critical)

### 4. Agent de Décision Augmentée
- Recommandations concrètes (acheter/vendre/conserver)
- Simulation et suivi de portefeuille virtuel
- Justifications transparentes pour chaque recommandation
- Métriques de performance (ROI, Sharpe Ratio, Max Drawdown)

## Architecture Technique

### Stack Technologique
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Build Tool**: Vite

### Structure de la Base de Données

Le système utilise 9 tables principales:

1. **stocks** - Catalogue des valeurs BVMT
2. **stock_prices** - Historique des prix et volumes
3. **predictions** - Prévisions générées par ML
4. **news_articles** - Articles de presse financière
5. **sentiment_analysis** - Analyse de sentiment des articles
6. **anomalies** - Anomalies détectées
7. **portfolios** - Portefeuilles utilisateurs
8. **portfolio_positions** - Positions individuelles
9. **recommendations** - Recommandations de l'agent

## Pages de l'Application

### 1. Vue d'Ensemble du Marché
- Indice TUNINDEX avec variation du jour
- Top 5 gagnants et perdants
- Sentiment global du marché
- Alertes récentes

### 2. Analyse de Valeur
- Sélecteur de valeur avec recherche
- Graphique historique des prix
- Prévisions 5 jours avec confiance
- Timeline de sentiment
- Recommandation de l'agent avec justification

### 3. Mon Portefeuille
- Vue d'ensemble (valeur totale, gains/pertes, ROI)
- Liste des positions avec P&L
- Graphique de répartition par secteur
- Évolution de la performance
- Suggestions d'optimisation

### 4. Surveillance & Alertes
- Feed en temps réel des anomalies
- Filtres par type et sévérité
- Statistiques de détection
- Historique des alertes résolues

## Installation et Configuration

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase

### Installation

1. Cloner le repository
```bash
git clone [repository-url]
cd project
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement

Le fichier `.env` contient déjà les credentials Supabase:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Lancer l'application en développement
```bash
npm run dev
```

5. Builder pour la production
```bash
npm run build
```

## Données de Démonstration

Le système inclut des données de démonstration pour 15 valeurs majeures de la BVMT:

- **Banques**: SFBT, BNA, ATB
- **Télécommunications**: TT, ONE
- **Agroalimentaire**: DELICE, POULINA
- **Distribution**: SOTUMAG, MONOPRIX
- **Assurance**: TPR, STAR
- **Construction**: CARTHAGE
- **Industrie**: SITS, SOTUVER, SIMPAR

Les données incluent:
- 30 jours d'historique de prix
- Prévisions pour 5 jours
- Articles de presse avec analyse de sentiment
- Anomalies détectées
- Portefeuille démo avec 5 positions

## Sécurité

Le système implémente:
- Row Level Security (RLS) sur toutes les tables Supabase
- Accès public en lecture pour les données de marché
- Accès privé pour les portefeuilles utilisateurs
- Validation des données côté serveur
- Protection contre les injections SQL

## Métriques de Performance

Le système calcule automatiquement:
- **ROI** (Return on Investment)
- **Sharpe Ratio** (ratio rendement/risque)
- **Max Drawdown** (perte maximale)
- **Volatilité** du portefeuille
- **Alpha** et **Beta** (vs TUNINDEX)

## Fonctionnalités Futures

### Améliorations Prévues
- Intégration de données en temps réel via WebSocket
- Modèles ML plus sophistiqués (Transformer, GAN)
- Backtesting de stratégies
- Alertes personnalisées par email/SMS
- API REST pour intégration tierce
- Mode mobile responsive optimisé
- Support de l'authentification utilisateur
- Tableaux de bord personnalisables

## Scénarios d'Utilisation

### Investisseur Débutant
Ahmed veut investir 5000 TND mais ne connaît rien à la bourse. Le système lui recommande un portefeuille diversifié adapté à son profil de risque modéré et explique chaque recommandation.

### Trader Actif
Leila surveille les opportunités. Le système détecte un pic de volume anormal sur SFBT et lui envoie une alerte. Elle consulte l'analyse de sentiment et les prévisions avant de prendre sa décision.

### Régulateur (CMF)
Un inspecteur du CMF utilise le module de surveillance pour détecter des manipulations potentielles de marché et générer des rapports d'investigation.

## Support et Documentation

Pour toute question ou assistance:
- Documentation technique: `/docs`
- Issues GitHub: [repository-issues-url]
- Email: support@bvmt-assistant.tn

## Licence

Ce projet a été développé dans le cadre de l'IHEC CodeLab 2.0.

---

**Développé pour la Bourse des Valeurs Mobilières de Tunis (BVMT)**
**IHEC CodeLab 2.0 - Système d'Assistant Intelligent de Trading**
