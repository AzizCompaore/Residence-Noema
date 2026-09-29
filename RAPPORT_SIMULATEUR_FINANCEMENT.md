# Rapport de situation - Simulateur de financement NOEMA

Date : 21 septembre 2026

## 0. Paramètres métier centralisés

Les paramètres de simulation sont centralisés dans `frontend/src/services/financing.ts` :

- taux annuel : **8 %** ;
- durée maximale : **8 ans**, soit 96 mensualités maximum ;
- seuil indicatif d'endettement : **35 %** ;
- occupation locative minimale : **20 jours par mois** ;
- taux de conversion : **1 € = 655,957 FCFA** ;
- taux de reconnaissance locative par défaut : **100 %**, hypothèse de simulation à confirmer avec la banque ;
- charges immobilières : **0 FCFA** par défaut, faute de valeur confirmée.

## 1. Synthèse exécutive

Le simulateur actuel est un simulateur de capacité de remboursement classique enrichi d'une hypothèse locative commune à tous les lots. Il calcule une mensualité de crédit à partir du prix du lot, de l'apport, de la durée et d'un taux indicatif, puis compare cette mensualité aux revenus déclarés, au revenu locatif propriétaire et aux charges existantes.

Les revenus locatifs sont maintenant intégrés selon une hypothèse métier : 20 jours minimum d'occupation par mois, 60 € par jour pour un T2, 100 € par jour pour un T3, 20 % conservés par la structure et 80 % reversés au propriétaire. Cette hypothèse doit encore être validée contractuellement et par la banque.

La durée peut être réduite par l'utilisateur jusqu'à 1 an, avec un maximum métier de 8 ans. La gestion locative est analysée séparément : les 80 % revenant au propriétaire ne diminuent jamais la mensualité bancaire. Ils servent à calculer le cash-flow du projet et peuvent, selon le taux de reconnaissance configuré, être ajoutés aux revenus retenus pour la solvabilité.

## 2. Parcours actuel du simulateur

Le parcours comporte les étapes suivantes :

1. Sélection du lot à financer.
2. Pays de résidence.
3. Situation professionnelle et âge.
4. Revenus mensuels nets, avec un revenu complémentaire facultatif.
5. Apport personnel.
6. Charges et crédits mensuels existants.
7. Type de projet et durée de financement.
8. Résultat indicatif et formulaire de contact.

Le simulateur collecte également le prénom, le nom, le téléphone, l'email, le consentement RGPD et le consentement marketing.

## 3. Données actuellement utilisées dans le calcul

Le calcul reçoit les données suivantes :

- prix du lot ;
- apport personnel ;
- durée du prêt ;
- taux d'intérêt indicatif ;
- revenu net principal ;
- revenus complémentaires ;
- revenus éventuels d'un co-emprunteur ;
- revenu locatif net propriétaire calculé automatiquement ;
- charges ou crédits mensuels existants.

Les données de revenus complémentaires et de co-emprunteur existent dans l'API, mais le parcours utilisateur actuel ne propose pas encore de véritable parcours de co-emprunteur ni de qualification détaillée de la nature du revenu complémentaire.

## 4. Calcul de la mensualité

Le simulateur utilise une formule d'amortissement standard :

`M = P x [r x (1 + r)^n] / [(1 + r)^n - 1]`

Avec :

- `M` = mensualité estimée ;
- `P` = montant emprunté ;
- `r` = taux mensuel, soit taux annuel / 12 ;
- `n` = nombre total de mensualités, soit durée en années x 12.

Le montant emprunté est calculé ainsi :

`Montant emprunté = prix du lot - apport personnel`

Le montant est plafonné à zéro et l'apport est plafonné au prix du lot.

Paramètres actuels :

- taux annuel fixe : 8 % ;
- durée maximale appliquée par le serveur et l'interface : 8 ans ;
- durée sélectionnable dans l'interface : de 1 à 8 ans ;
- taux d'endettement indicatif : 35 %.

Le taux de 8 % et le seuil de 35 % sont des paramètres de simulation. Ils doivent être confirmés avec la banque ou la cliente.

## 5. Calcul des revenus et du taux d'endettement

Les revenus retenus sont actuellement additionnés :

`Revenu personnel = revenu principal + revenus complémentaires + revenus du co-emprunteur`

`Revenu locatif retenu = revenu locatif propriétaire x taux de reconnaissance locative`

`Revenus retenus = revenu personnel + revenu locatif retenu`

Le revenu locatif est calculé ainsi :

`Revenu locatif brut = 20 jours x tarif journalier`

`Part structure = revenu locatif brut x 20 %`

`Revenu locatif propriétaire = revenu locatif brut x 80 %`

Donc, avec l'hypothèse actuelle :

- T2 : 20 x 60 € = 1 200 € brut ; 960 € net propriétaire par mois ;
- T3 : 20 x 100 € = 2 000 € brut ; 1 600 € net propriétaire par mois.

Aucune charge supplémentaire n'est déduite de la part de 80 % du propriétaire dans le simulateur. Cette part reste un revenu du projet, séparé de la mensualité bancaire.

Les charges existantes ne sont pas déduites des revenus pour calculer le taux. Elles sont ajoutées aux nouvelles mensualités dans le total des engagements :

`Engagements totaux = mensualité bancaire complète + crédits existants`

Puis :

`Taux d'endettement = engagements totaux / revenus retenus x 100`

Le résultat est considéré comme dans le seuil si le taux est inférieur ou égal à 35 %. Le revenu locatif ne réduit jamais les engagements : il peut uniquement augmenter les revenus retenus selon le taux de reconnaissance configuré.

Le simulateur calcule également :

`Reste à vivre = revenus retenus - engagements totaux - dépenses de vie`

et :

`Budget mensuel recommandé = revenus retenus x 35 %`

Attention : le taux d'endettement, le reste à vivre et le cash-flow locatif sont trois indicateurs différents.

## 6. Pourquoi beaucoup de simulations dépassent 35 %

### 6.1 La durée de 8 ans augmente fortement les mensualités

Une durée courte rembourse le capital rapidement. La mensualité est donc plus élevée qu'avec un prêt sur 15, 20 ou 25 ans.

La limitation à 8 ans est cohérente avec l'information communiquée sur la banque. L'utilisateur peut choisir une durée plus courte, mais cela augmente la mensualité et rend les lots plus difficiles à financer avec des revenus moyens.

### 6.2 Les prix des lots sont élevés par rapport aux revenus saisis

Le catalogue actuel comprend notamment :

- T2 : 59 000 000 FCFA ;
- T3 : 109 000 000 FCFA.

Avec les chiffres visibles dans la capture, avant le passage au taux métier de 8 % et à la règle locative complète :

- mensualité : environ 394 894 FCFA ;
- taux affiché : 55,8 % ;
- revenus retenus estimés : environ 707 700 FCFA par mois.

À 35 %, l'ensemble des engagements ne devrait pas dépasser 35 % des revenus retenus. La mensualité complète doit toujours être comparée à ce seuil ; le cash-flow locatif ne peut pas la remplacer.

### 6.3 L'apport réduit directement le capital financé

Plus l'apport est élevé, plus la mensualité baisse. Avec la règle locative actuelle, l'apport ne doit toutefois plus être analysé seul : il faut comparer la mensualité au revenu locatif net propriétaire.

Exemple indicatif avec le T2 de 59 000 000 FCFA, un taux de 8 % et une durée de 8 ans :

- revenu locatif brut : 1 200 € par mois ;
- revenu locatif propriétaire après 20 % : 960 € par mois, soit environ 629 700 FCFA ;
- mensualité bancaire : calculée intégralement selon la formule d'amortissement pour la durée choisie, plafonnée à 8 ans ;
- cash-flow avant autres charges : revenu propriétaire - mensualité bancaire - charges immobilières ;
- la mensualité reste un engagement complet, même lorsque le cash-flow est positif.

Ces chiffres sont des estimations du modèle NOEMA et ne constituent pas une décision bancaire. Ils supposent que les 20 jours d'occupation et les revenus locatifs sont effectivement garantis ou acceptés par la banque.

### 6.4 Les revenus locatifs réduisent directement l'engagement à financer

Le revenu locatif net propriétaire n'est pas utilisé pour réduire la mensualité. Il est ajouté aux revenus retenus uniquement selon `rentalIncomeRecognitionRate`, paramètre centralisé et modifiable.

Cette règle repose sur l'hypothèse que les revenus locatifs sont effectivement garantis ou suffisamment documentés par la structure et acceptés par la banque. Le contrat de gestion et la méthode bancaire devront donc être confirmés.

## 7. Ce qui doit être confirmé avec la cliente

Il faut d'abord clarifier le produit concerné :

- Quels lots peuvent être exploités en location ?
- La location est-elle longue durée, courte durée, para-hôtelière ou mixte ?
- La gestion locative est-elle obligatoire ou optionnelle ?
- Qui exploite le bien : le propriétaire, NOEMA, un opérateur ou une agence partenaire ?
- Existe-t-il une formule avec loyer garanti ?
- Existe-t-il une formule avec partage de revenus ?
- Le propriétaire peut-il occuper le logement certaines périodes ?
- La location est-elle autorisée par le règlement de copropriété ?

## 8. Questions sur les revenus locatifs

### Hypothèses de revenus

- Quel loyer mensuel brut est prévu pour chaque type de lot ?
- Le loyer est-il différent selon le T2, le T3, l'étage, la vue ou le mobilier ?
- Quel est le taux d'occupation prudent à retenir ?
- Quelle saisonnalité faut-il prévoir ?
- Quel montant annuel peut-on raisonnablement retenir dans un scénario prudent, central et optimiste ?
- Les revenus annoncés sont-ils garantis contractuellement ou simplement prévisionnels ?

### Charges à déduire

- Quel est le montant de la gestion locative ?
- La commission est-elle prélevée sur le loyer brut ou sur le revenu encaissé ?
- Qui paie les charges de copropriété ?
- Qui paie l'entretien, les réparations, le ménage et le renouvellement du mobilier ?
- Les assurances, taxes et périodes de vacance sont-elles incluses dans les projections ?
- Existe-t-il des frais de commercialisation, de plateforme ou de conciergerie ?
- Quel est le revenu net réellement reversé au propriétaire ?

### Cadre contractuel

- Quelle est la durée du mandat de gestion ?
- Comment le propriétaire peut-il résilier le mandat ?
- Quel est le délai de versement des loyers ?
- Le gestionnaire fournit-il un relevé mensuel et un compte rendu annuel ?
- Qui supporte les impayés et les dégradations ?
- Le revenu est-il garanti même en cas de logement vacant ?
- Quelles sont les conditions exactes de cette garantie ?

## 9. Questions bancaires indispensables

- La banque accepte-t-elle les revenus locatifs futurs dans l'étude de solvabilité ?
- Quelle part du loyer prévisionnel est retenue : 100 %, 70 %,  et quelle décote exacte ?
- Faut-il un bail signé, un mandat de gestion, une garantie de loyer ou un historique d'encaissement ?
- Le revenu locatif est-il retenu avant ou après les charges de gestion ?
- Le seuil d'endettement reste-t-il strictement à 35 % pour ce dossier ?
- La banque applique-t-elle une règle spécifique aux revenus de courte durée ou de location meublée ?
- La durée maximale de 8 ans est-elle ferme pour tous les lots et tous les profils ?
- La banque confirme-t-elle le taux de simulation de 8 % et dans quelles conditions ?
- Quels frais doivent être intégrés : assurance emprunteur, frais de dossier, garantie, notaire et travaux ?
- La banque accepte-t-elle un co-emprunteur ou une société d'exploitation ?

## 10. Gestion locative intégrée dans la version actuelle

Le simulateur sépare désormais le financement, la rentabilité locative et la solvabilité. La mensualité bancaire reste toujours complète et les revenus locatifs sont calculés à part.

### Étape A : calculer le revenu locatif brut prévisionnel

`Revenu locatif brut = 20 jours minimum x tarif journalier du type de lot`

Les jours non loués incluent déjà l'occupation personnelle du client, la vacance et les autres jours non commercialisés. Le minimum de 20 jours est donc l'hypothèse mensuelle retenue.

### Étape B : appliquer la retenue de gestion

`Revenu propriétaire = revenu locatif brut x 80 %`

`Part structure = revenu locatif brut x 20 %`

La part de 80 % du propriétaire ne subit aucune autre déduction dans la règle actuelle.

### Étape C : calculer le cash-flow locatif

`Cash-flow locatif = revenu propriétaire - mensualité bancaire - charges immobilières`

Le cash-flow peut être négatif ou positif. Il ne remplace jamais la mensualité bancaire et ne doit pas être appelé « reliquat de mensualité ».

### Étape D : appliquer la reconnaissance locative à la solvabilité

`Revenu locatif retenu = revenu propriétaire x rentalIncomeRecognitionRate`

`Revenus retenus = revenus personnels + revenu locatif retenu`

`Engagements totaux = mensualité bancaire complète + crédits existants`

`Taux d'endettement = engagements totaux / revenus retenus x 100`

Le taux de reconnaissance par défaut est fixé à 100 % comme hypothèse de simulation. Il ne s'agit pas d'une règle bancaire confirmée. Il pourra être passé à 70 %, 0 % ou toute autre valeur confirmée par la banque, sans modifier la mensualité.

### Étape E : afficher les éléments de transparence

Le simulateur affiche désormais : prix, apport, capital emprunté, taux, durée, mensualité bancaire, revenu locatif brut, part structure, revenu propriétaire, revenu locatif retenu, crédits existants, engagements complets, taux d'endettement, cash-flow locatif et reste à vivre.

## 11. Tests automatisés

La commande `npm run test:financing` couvre les cas suivants :

- mensualité T2 et T3 avec 0 apport à 8 % sur 96 mois ;
- durée réduite à 4 ans et plafonnement d'une durée supérieure à 8 ans ;
- effet d'un apport plus important ;
- invariance de la mensualité lorsque le revenu locatif change ;
- reconnaissance locative à 100 %, 70 % et 0 % ;
- crédits existants et dépenses de vie séparés ;
- cash-flow négatif et positif sans modification de la mensualité ;
- apport égal ou supérieur au prix du bien ;
- revenus nuls sans division par zéro.

Les tests du moteur, le lint TypeScript, le contrôle Django et le build de production sont validés.

## 12. Données à confirmer ou à ajouter

- formule d'exploitation choisie ;
- type de location ;
- loyer brut mensuel estimé ;
- taux d'occupation estimé ;
- frais de gestion en pourcentage ou montant fixe ;
- charges mensuelles liées au lot ;
- revenu locatif net estimé ;
- taux de reconnaissance bancaire des revenus locatifs ;
- dépenses de vie mensuelles pour calculer le reste à vivre ;
- présence d'une garantie de loyer ;
- durée d'une éventuelle garantie ;
- période d'occupation personnelle ;
- scénario choisi : prudent, central ou optimiste.

## 13. Recommandation pour la réunion

La règle locative est maintenant intégrée sur la base de 20 jours, des tarifs T2/T3 et du partage 80/20. La décision la plus importante est désormais d'obtenir le taux officiel de reconnaissance des revenus locatifs par la banque. La mensualité bancaire doit rester complète dans tous les scénarios.

Pendant la réunion, demander à la cliente une simulation complète par lot avec : prix, apport minimum, taux de 8 %, durée choisie entre 1 et 8 ans, loyer brut, revenu net propriétaire, charges immobilières, cash-flow, taux de reconnaissance bancaire, crédits existants et dépenses de vie.

Après validation de ces éléments, le simulateur pourra être consolidé autour de deux résultats distincts :

1. capacité bancaire et taux d'endettement ;
2. rentabilité et trésorerie nette du projet.

Il ne faut pas présenter la rentabilité locative comme une garantie d'obtention du crédit tant que la banque n'a pas confirmé sa méthode de calcul.
