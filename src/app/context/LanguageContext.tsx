import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'es' | 'en' | 'fr' | 'de' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.offers': 'Ofertas',
    'nav.cart': 'Carrito',
    'nav.profile': 'Perfil',
    
    // Common
    'common.back': 'Volver',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Añadir',
    'common.remove': 'Quitar',
    'common.close': 'Cerrar',
    'common.confirm': 'Confirmar',
    
    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.logout': 'Cerrar sesión',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    
    // Home
    'home.foodtrucks': 'Food Trucks',
    'home.bars': 'Bares',
    'home.selectService': 'Selecciona un servicio',
    
    // Cart
    'cart.title': 'Mi Carrito',
    'cart.empty': 'Tu carrito está vacío',
    'cart.subtotal': 'Subtotal',
    'cart.delivery': 'Entrega',
    'cart.total': 'Total',
    'cart.checkout': 'Proceder al pago',
    'cart.addedToCart': 'Añadido al carrito',
    'cart.applyCoupon': 'Aplicar cupón',
    
    // Profile
    'profile.title': 'Mi Perfil',
    'profile.personalInfo': 'Información Personal',
    'profile.paymentMethods': 'Métodos de Pago',
    'profile.orderHistory': 'Mis Pedidos',
    'profile.favorites': 'Favoritos',
    'profile.helpSupport': 'Ayuda y Soporte',
    'profile.language': 'Idioma',
    'profile.reviews': 'Mis reseñas',

    // Reviews
    'reviews.title': 'Reseñas',
    'reviews.myTitle': 'Mis reseñas',
    'reviews.verifiedOrders': 'Opiniones verificadas de pedidos reales',
    'reviews.mySubtitle': 'Todas las reseñas que has publicado',
    'reviews.myListSubtitle': 'También verás los royalties que ganaste en cada una.',
    'reviews.defaultTitle': 'Reseñas',
    'reviews.noReviews': 'Todavía no hay reseñas para mostrar.',
    'reviews.countSuffix': 'reseñas',
    'reviews.seeAll': 'Ver todas',
    'reviews.writeTitle': 'Escribir reseña',
    'reviews.orderNotFoundTitle': 'Pedido no encontrado',
    'reviews.orderNotFoundBody': 'No hemos podido preparar la reseña de este pedido.',
    'reviews.alreadyReviewedTitle': 'Este pedido ya está revisado',
    'reviews.alreadyReviewedBody': 'Cada pedido puede tener una única reseña.',
    'reviews.viewMyReviews': 'Ver mis reseñas',
    'reviews.generalSectionTitle': 'Valoración general',
    'reviews.generalSectionSubtitle': 'Solo las estrellas generales son obligatorias.',
    'reviews.generalStars': 'Estrellas generales',
    'reviews.comment': 'Comentario',
    'reviews.commentPlaceholder': 'Cuenta qué tal fue la experiencia...',
    'reviews.commentBonus': '+20 puntos si escribes al menos 10 caracteres.',
    'reviews.optionalConceptsTitle': 'Conceptos opcionales',
    'reviews.optionalConceptsSubtitle': 'Completar las tres valoraciones suma +20 puntos.',
    'reviews.service': 'Servicio',
    'reviews.staff': 'Personal',
    'reviews.speed': 'Rapidez',
    'reviews.orderProductsTitle': 'Productos del pedido',
    'reviews.orderProductsSubtitle': 'Puedes valorar productos concretos. Suman +20 puntos cada uno, máximo 3.',
    'reviews.quantity': 'Cantidad',
    'reviews.rate': 'Valorar',
    'reviews.productStars': 'Estrellas del producto',
    'reviews.productCommentPlaceholder': 'Comentario opcional sobre este producto',
    'reviews.estimatedRoyalties': 'Royalties estimados',
    'reviews.publish': 'Publicar reseña',
    'reviews.requiredGeneral': 'Las estrellas generales son obligatorias',
    'reviews.savedToast': 'Reseña guardada. Has ganado',
    'reviews.productTitle': 'Reseñas del producto',
    'reviews.productSubtitle': 'Opiniones verificadas de personas que lo han pedido.',
    'reviews.foodTruckTitle': 'Reseñas del food truck',
    'reviews.foodTruckSubtitle': 'Opiniones verificadas de pedidos realizados aquí.',
    'reviews.barTitle': 'Reseñas de la barra',
    'reviews.barSubtitle': 'Opiniones verificadas de pedidos realizados aquí.',
    'reviews.reviewProduct': 'Reseñar este producto',
    'reviews.reviewProductAlready': 'Ya no tienes pedidos pendientes de reseñar',
    'reviews.reviewProductLocked': 'Pídelo una vez para poder reseñarlo',
    'reviews.orderConfirmationCta': 'Reseñar pedido y ganar royalties',
    'reviews.starAria': 'estrellas',
    
    // Personal Info
    'personalInfo.title': 'Información Personal',
    'personalInfo.name': 'Nombre',
    'personalInfo.email': 'Email',
    'personalInfo.phone': 'Teléfono',
    'personalInfo.saveChanges': 'Guardar cambios',
    'personalInfo.saved': 'Cambios guardados correctamente',
    
    // Payment Methods
    'payment.title': 'Métodos de Pago',
    'payment.addCard': 'Añadir tarjeta',
    'payment.default': 'Predeterminada',
    'payment.setDefault': 'Establecer como predeterminada',
    'payment.expiresOn': 'Expira',
    'payment.cardRemoved': 'Tarjeta eliminada',
    
    // Order History
    'orders.title': 'Mis Pedidos',
    'orders.orderNumber': 'Pedido #',
    'orders.date': 'Fecha',
    'orders.total': 'Total',
    'orders.status': 'Estado',
    'orders.empty': 'No tienes pedidos aún',
    'orders.pending': 'Pendiente',
    'orders.preparing': 'En preparación',
    'orders.ready': 'Listo',
    'orders.completed': 'Completado',
    'orders.cancelled': 'Cancelado',
    
    // Favorites
    'favorites.title': 'Favoritos',
    'favorites.empty': 'No tienes favoritos aún',
    'favorites.removed': 'Eliminado de favoritos',
    
    // Help & Support
    'help.title': 'Ayuda y Soporte',
    'help.faq': 'Preguntas Frecuentes',
    'help.contact': 'Contactar Soporte',
    'help.subject': 'Asunto',
    'help.message': 'Mensaje',
    'help.send': 'Enviar',
    'help.messageSent': 'Mensaje enviado',
    
    // Track Order
    'track.title': 'Seguir Pedido',
    'track.orderNumber': 'Nº de Pedido',
    'track.estimatedTime': 'Tiempo estimado',
    'track.minutes': 'min',
    'track.inQueue': 'En cola',
    'track.preparing': 'En preparación',
    'track.readyPickup': 'Listo para recoger',
    
    // Status
    'status.offer': 'OFERTA',
    'status.fastQueue': 'COLA RÁPIDA',
    'status.saturated': 'COLA SATURADA',
    
    // Languages
    'lang.spanish': 'Español',
    'lang.english': 'English',
    'lang.french': 'Français',
    'lang.german': 'Deutsch',
    'lang.arabic': 'العربية',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.offers': 'Offers',
    'nav.cart': 'Cart',
    'nav.profile': 'Profile',
    
    // Common
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    
    // Auth
    'auth.login': 'Log In',
    'auth.logout': 'Log Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    
    // Home
    'home.foodtrucks': 'Food Trucks',
    'home.bars': 'Bars',
    'home.selectService': 'Select a service',
    
    // Cart
    'cart.title': 'My Cart',
    'cart.empty': 'Your cart is empty',
    'cart.subtotal': 'Subtotal',
    'cart.delivery': 'Delivery',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.addedToCart': 'Added to cart',
    'cart.applyCoupon': 'Apply coupon',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.personalInfo': 'Personal Information',
    'profile.paymentMethods': 'Payment Methods',
    'profile.orderHistory': 'My Orders',
    'profile.favorites': 'Favorites',
    'profile.helpSupport': 'Help & Support',
    'profile.language': 'Language',
    'profile.reviews': 'My reviews',

    // Reviews
    'reviews.title': 'Reviews',
    'reviews.myTitle': 'My reviews',
    'reviews.verifiedOrders': 'Verified opinions from real orders',
    'reviews.mySubtitle': 'All the reviews you have published',
    'reviews.myListSubtitle': 'You will also see the royalties earned for each one.',
    'reviews.defaultTitle': 'Reviews',
    'reviews.noReviews': 'There are no reviews to show yet.',
    'reviews.countSuffix': 'reviews',
    'reviews.seeAll': 'See all',
    'reviews.writeTitle': 'Write a review',
    'reviews.orderNotFoundTitle': 'Order not found',
    'reviews.orderNotFoundBody': 'We could not prepare the review for this order.',
    'reviews.alreadyReviewedTitle': 'This order has already been reviewed',
    'reviews.alreadyReviewedBody': 'Each order can have only one review.',
    'reviews.viewMyReviews': 'View my reviews',
    'reviews.generalSectionTitle': 'General rating',
    'reviews.generalSectionSubtitle': 'Only the general stars are required.',
    'reviews.generalStars': 'General stars',
    'reviews.comment': 'Comment',
    'reviews.commentPlaceholder': 'Tell us how the experience went...',
    'reviews.commentBonus': '+20 points if you write at least 10 characters.',
    'reviews.optionalConceptsTitle': 'Optional concepts',
    'reviews.optionalConceptsSubtitle': 'Completing the three ratings adds +20 points.',
    'reviews.service': 'Service',
    'reviews.staff': 'Staff',
    'reviews.speed': 'Speed',
    'reviews.orderProductsTitle': 'Order products',
    'reviews.orderProductsSubtitle': 'You can rate specific products. They add +20 points each, maximum 3.',
    'reviews.quantity': 'Quantity',
    'reviews.rate': 'Rate',
    'reviews.productStars': 'Product stars',
    'reviews.productCommentPlaceholder': 'Optional comment about this product',
    'reviews.estimatedRoyalties': 'Estimated royalties',
    'reviews.publish': 'Publish review',
    'reviews.requiredGeneral': 'General stars are required',
    'reviews.savedToast': 'Review saved. You earned',
    'reviews.productTitle': 'Product reviews',
    'reviews.productSubtitle': 'Verified opinions from people who ordered it.',
    'reviews.foodTruckTitle': 'Food truck reviews',
    'reviews.foodTruckSubtitle': 'Verified opinions from orders placed here.',
    'reviews.barTitle': 'Bar reviews',
    'reviews.barSubtitle': 'Verified opinions from orders placed here.',
    'reviews.reviewProduct': 'Review this product',
    'reviews.reviewProductAlready': 'You have no pending orders to review',
    'reviews.reviewProductLocked': 'Order it once to review it',
    'reviews.orderConfirmationCta': 'Review order and earn royalties',
    'reviews.starAria': 'stars',
    
    // Personal Info
    'personalInfo.title': 'Personal Information',
    'personalInfo.name': 'Name',
    'personalInfo.email': 'Email',
    'personalInfo.phone': 'Phone',
    'personalInfo.saveChanges': 'Save changes',
    'personalInfo.saved': 'Changes saved successfully',
    
    // Payment Methods
    'payment.title': 'Payment Methods',
    'payment.addCard': 'Add card',
    'payment.default': 'Default',
    'payment.setDefault': 'Set as default',
    'payment.expiresOn': 'Expires',
    'payment.cardRemoved': 'Card removed',
    
    // Order History
    'orders.title': 'My Orders',
    'orders.orderNumber': 'Order #',
    'orders.date': 'Date',
    'orders.total': 'Total',
    'orders.status': 'Status',
    'orders.empty': 'No orders yet',
    'orders.pending': 'Pending',
    'orders.preparing': 'Preparing',
    'orders.ready': 'Ready',
    'orders.completed': 'Completed',
    'orders.cancelled': 'Cancelled',
    
    // Favorites
    'favorites.title': 'Favorites',
    'favorites.empty': 'No favorites yet',
    'favorites.removed': 'Removed from favorites',
    
    // Help & Support
    'help.title': 'Help & Support',
    'help.faq': 'Frequently Asked Questions',
    'help.contact': 'Contact Support',
    'help.subject': 'Subject',
    'help.message': 'Message',
    'help.send': 'Send',
    'help.messageSent': 'Message sent',
    
    // Track Order
    'track.title': 'Track Order',
    'track.orderNumber': 'Order Number',
    'track.estimatedTime': 'Estimated time',
    'track.minutes': 'min',
    'track.inQueue': 'In queue',
    'track.preparing': 'Preparing',
    'track.readyPickup': 'Ready for pickup',
    
    // Status
    'status.offer': 'OFFER',
    'status.fastQueue': 'FAST QUEUE',
    'status.saturated': 'QUEUE SATURATED',
    
    // Languages
    'lang.spanish': 'Español',
    'lang.english': 'English',
    'lang.french': 'Français',
    'lang.german': 'Deutsch',
    'lang.arabic': 'العربية',
  },
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.offers': 'Offres',
    'nav.cart': 'Panier',
    'nav.profile': 'Profil',
    
    // Common
    'common.back': 'Retour',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.remove': 'Retirer',
    'common.close': 'Fermer',
    'common.confirm': 'Confirmer',
    
    // Auth
    'auth.login': 'Se connecter',
    'auth.logout': 'Se déconnecter',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    
    // Home
    'home.foodtrucks': 'Food Trucks',
    'home.bars': 'Bars',
    'home.selectService': 'Sélectionnez un service',
    
    // Cart
    'cart.title': 'Mon Panier',
    'cart.empty': 'Votre panier est vide',
    'cart.subtotal': 'Sous-total',
    'cart.delivery': 'Livraison',
    'cart.total': 'Total',
    'cart.checkout': 'Commander',
    'cart.addedToCart': 'Ajouté au panier',
    'cart.applyCoupon': 'Appliquer le coupon',
    
    // Profile
    'profile.title': 'Mon Profil',
    'profile.personalInfo': 'Informations Personnelles',
    'profile.paymentMethods': 'Modes de Paiement',
    'profile.orderHistory': 'Mes Commandes',
    'profile.favorites': 'Favoris',
    'profile.helpSupport': 'Aide et Support',
    'profile.language': 'Langue',
    'profile.reviews': 'Mes avis',

    // Reviews
    'reviews.title': 'Avis',
    'reviews.myTitle': 'Mes avis',
    'reviews.verifiedOrders': 'Avis verifies de commandes reelles',
    'reviews.mySubtitle': 'Tous les avis que vous avez publies',
    'reviews.myListSubtitle': 'Vous verrez aussi les royalties gagnees pour chacun.',
    'reviews.defaultTitle': 'Avis',
    'reviews.noReviews': 'Il n y a pas encore d avis a afficher.',
    'reviews.countSuffix': 'avis',
    'reviews.seeAll': 'Tout voir',
    'reviews.writeTitle': 'Ecrire un avis',
    'reviews.orderNotFoundTitle': 'Commande introuvable',
    'reviews.orderNotFoundBody': 'Nous n avons pas pu preparer l avis de cette commande.',
    'reviews.alreadyReviewedTitle': 'Cette commande a deja ete evaluee',
    'reviews.alreadyReviewedBody': 'Chaque commande ne peut avoir qu un seul avis.',
    'reviews.viewMyReviews': 'Voir mes avis',
    'reviews.generalSectionTitle': 'Note generale',
    'reviews.generalSectionSubtitle': 'Seules les etoiles generales sont obligatoires.',
    'reviews.generalStars': 'Etoiles generales',
    'reviews.comment': 'Commentaire',
    'reviews.commentPlaceholder': 'Racontez comment s est passee l experience...',
    'reviews.commentBonus': '+20 points si vous ecrivez au moins 10 caracteres.',
    'reviews.optionalConceptsTitle': 'Concepts optionnels',
    'reviews.optionalConceptsSubtitle': 'Completer les trois notes ajoute +20 points.',
    'reviews.service': 'Service',
    'reviews.staff': 'Personnel',
    'reviews.speed': 'Rapidité',
    'reviews.orderProductsTitle': 'Produits de la commande',
    'reviews.orderProductsSubtitle': 'Vous pouvez noter des produits concrets. Ils ajoutent +20 points chacun, maximum 3.',
    'reviews.quantity': 'Quantite',
    'reviews.rate': 'Noter',
    'reviews.productStars': 'Etoiles du produit',
    'reviews.productCommentPlaceholder': 'Commentaire optionnel sur ce produit',
    'reviews.estimatedRoyalties': 'Royalties estimees',
    'reviews.publish': 'Publier l avis',
    'reviews.requiredGeneral': 'Les etoiles generales sont obligatoires',
    'reviews.savedToast': 'Avis enregistre. Vous avez gagne',
    'reviews.productTitle': 'Avis du produit',
    'reviews.productSubtitle': 'Avis verifies de personnes qui l ont commande.',
    'reviews.foodTruckTitle': 'Avis du food truck',
    'reviews.foodTruckSubtitle': 'Avis verifies de commandes passees ici.',
    'reviews.barTitle': 'Avis du bar',
    'reviews.barSubtitle': 'Avis verifies de commandes passees ici.',
    'reviews.reviewProduct': 'Donner un avis sur ce produit',
    'reviews.reviewProductAlready': 'Vous n avez plus de commandes a evaluer',
    'reviews.reviewProductLocked': 'Commandez-le une fois pour pouvoir l evaluer',
    'reviews.orderConfirmationCta': 'Evaluer la commande et gagner des royalties',
    'reviews.starAria': 'etoiles',
    
    // Personal Info
    'personalInfo.title': 'Informations Personnelles',
    'personalInfo.name': 'Nom',
    'personalInfo.email': 'Email',
    'personalInfo.phone': 'Téléphone',
    'personalInfo.saveChanges': 'Enregistrer les modifications',
    'personalInfo.saved': 'Modifications enregistrées',
    
    // Payment Methods
    'payment.title': 'Modes de Paiement',
    'payment.addCard': 'Ajouter une carte',
    'payment.default': 'Par défaut',
    'payment.setDefault': 'Définir par défaut',
    'payment.expiresOn': 'Expire',
    'payment.cardRemoved': 'Carte supprimée',
    
    // Order History
    'orders.title': 'Mes Commandes',
    'orders.orderNumber': 'Commande #',
    'orders.date': 'Date',
    'orders.total': 'Total',
    'orders.status': 'Statut',
    'orders.empty': 'Aucune commande',
    'orders.pending': 'En attente',
    'orders.preparing': 'En préparation',
    'orders.ready': 'Prêt',
    'orders.completed': 'Terminé',
    'orders.cancelled': 'Annulé',
    
    // Favorites
    'favorites.title': 'Favoris',
    'favorites.empty': 'Aucun favori',
    'favorites.removed': 'Retiré des favoris',
    
    // Help & Support
    'help.title': 'Aide et Support',
    'help.faq': 'Questions Fréquentes',
    'help.contact': 'Contacter le Support',
    'help.subject': 'Sujet',
    'help.message': 'Message',
    'help.send': 'Envoyer',
    'help.messageSent': 'Message envoyé',
    
    // Track Order
    'track.title': 'Suivre la Commande',
    'track.orderNumber': 'Nº de Commande',
    'track.estimatedTime': 'Temps estimé',
    'track.minutes': 'min',
    'track.inQueue': 'En file d\'attente',
    'track.preparing': 'En préparation',
    'track.readyPickup': 'Prêt à récupérer',
    
    // Status
    'status.offer': 'OFFRE',
    'status.fastQueue': 'FILE RAPIDE',
    'status.saturated': 'FILE SATURÉE',
    
    // Languages
    'lang.spanish': 'Español',
    'lang.english': 'English',
    'lang.french': 'Français',
    'lang.german': 'Deutsch',
    'lang.arabic': 'العربية',
  },
  de: {
    // Navigation
    'nav.home': 'Startseite',
    'nav.offers': 'Angebote',
    'nav.cart': 'Warenkorb',
    'nav.profile': 'Profil',
    
    // Common
    'common.back': 'Zurück',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.add': 'Hinzufügen',
    'common.remove': 'Entfernen',
    'common.close': 'Schließen',
    'common.confirm': 'Bestätigen',
    
    // Auth
    'auth.login': 'Anmelden',
    'auth.logout': 'Abmelden',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    
    // Home
    'home.foodtrucks': 'Food Trucks',
    'home.bars': 'Bars',
    'home.selectService': 'Service auswählen',
    
    // Cart
    'cart.title': 'Mein Warenkorb',
    'cart.empty': 'Ihr Warenkorb ist leer',
    'cart.subtotal': 'Zwischensumme',
    'cart.delivery': 'Lieferung',
    'cart.total': 'Gesamt',
    'cart.checkout': 'Zur Kasse',
    'cart.addedToCart': 'Zum Warenkorb hinzugefügt',
    'cart.applyCoupon': 'Gutschein anwenden',
    
    // Profile
    'profile.title': 'Mein Profil',
    'profile.personalInfo': 'Persönliche Informationen',
    'profile.paymentMethods': 'Zahlungsmethoden',
    'profile.orderHistory': 'Meine Bestellungen',
    'profile.favorites': 'Favoriten',
    'profile.helpSupport': 'Hilfe & Support',
    'profile.language': 'Sprache',
    'profile.reviews': 'Meine Bewertungen',

    // Reviews
    'reviews.title': 'Bewertungen',
    'reviews.myTitle': 'Meine Bewertungen',
    'reviews.verifiedOrders': 'Verifizierte Meinungen aus echten Bestellungen',
    'reviews.mySubtitle': 'Alle Bewertungen, die du veroffentlicht hast',
    'reviews.myListSubtitle': 'Du siehst auch die Royalties, die du jeweils verdient hast.',
    'reviews.defaultTitle': 'Bewertungen',
    'reviews.noReviews': 'Es gibt noch keine Bewertungen.',
    'reviews.countSuffix': 'Bewertungen',
    'reviews.seeAll': 'Alle ansehen',
    'reviews.writeTitle': 'Bewertung schreiben',
    'reviews.orderNotFoundTitle': 'Bestellung nicht gefunden',
    'reviews.orderNotFoundBody': 'Wir konnten die Bewertung fur diese Bestellung nicht vorbereiten.',
    'reviews.alreadyReviewedTitle': 'Diese Bestellung wurde bereits bewertet',
    'reviews.alreadyReviewedBody': 'Jede Bestellung kann nur eine Bewertung haben.',
    'reviews.viewMyReviews': 'Meine Bewertungen ansehen',
    'reviews.generalSectionTitle': 'Allgemeine Bewertung',
    'reviews.generalSectionSubtitle': 'Nur die allgemeinen Sterne sind Pflicht.',
    'reviews.generalStars': 'Allgemeine Sterne',
    'reviews.comment': 'Kommentar',
    'reviews.commentPlaceholder': 'Erzahl uns, wie die Erfahrung war...',
    'reviews.commentBonus': '+20 Punkte, wenn du mindestens 10 Zeichen schreibst.',
    'reviews.optionalConceptsTitle': 'Optionale Konzepte',
    'reviews.optionalConceptsSubtitle': 'Alle drei Bewertungen auszufullen bringt +20 Punkte.',
    'reviews.service': 'Service',
    'reviews.staff': 'Personal',
    'reviews.speed': 'Geschwindigkeit',
    'reviews.orderProductsTitle': 'Produkte der Bestellung',
    'reviews.orderProductsSubtitle': 'Du kannst einzelne Produkte bewerten. Sie bringen je +20 Punkte, maximal 3.',
    'reviews.quantity': 'Menge',
    'reviews.rate': 'Bewerten',
    'reviews.productStars': 'Produktsterne',
    'reviews.productCommentPlaceholder': 'Optionaler Kommentar zu diesem Produkt',
    'reviews.estimatedRoyalties': 'Geschatzte Royalties',
    'reviews.publish': 'Bewertung veroffentlichen',
    'reviews.requiredGeneral': 'Allgemeine Sterne sind Pflicht',
    'reviews.savedToast': 'Bewertung gespeichert. Du hast verdient',
    'reviews.productTitle': 'Produktbewertungen',
    'reviews.productSubtitle': 'Verifizierte Meinungen von Personen, die es bestellt haben.',
    'reviews.foodTruckTitle': 'Food-Truck-Bewertungen',
    'reviews.foodTruckSubtitle': 'Verifizierte Meinungen von Bestellungen hier.',
    'reviews.barTitle': 'Bar-Bewertungen',
    'reviews.barSubtitle': 'Verifizierte Meinungen von Bestellungen hier.',
    'reviews.reviewProduct': 'Dieses Produkt bewerten',
    'reviews.reviewProductAlready': 'Du hast keine offenen Bestellungen zum Bewerten',
    'reviews.reviewProductLocked': 'Bestelle es einmal, um es bewerten zu konnen',
    'reviews.orderConfirmationCta': 'Bestellung bewerten und Royalties verdienen',
    'reviews.starAria': 'Sterne',
    
    // Personal Info
    'personalInfo.title': 'Persönliche Informationen',
    'personalInfo.name': 'Name',
    'personalInfo.email': 'E-Mail',
    'personalInfo.phone': 'Telefon',
    'personalInfo.saveChanges': 'Änderungen speichern',
    'personalInfo.saved': 'Änderungen gespeichert',
    
    // Payment Methods
    'payment.title': 'Zahlungsmethoden',
    'payment.addCard': 'Karte hinzufügen',
    'payment.default': 'Standard',
    'payment.setDefault': 'Als Standard festlegen',
    'payment.expiresOn': 'Läuft ab',
    'payment.cardRemoved': 'Karte entfernt',
    
    // Order History
    'orders.title': 'Meine Bestellungen',
    'orders.orderNumber': 'Bestellung #',
    'orders.date': 'Datum',
    'orders.total': 'Gesamt',
    'orders.status': 'Status',
    'orders.empty': 'Keine Bestellungen',
    'orders.pending': 'Ausstehend',
    'orders.preparing': 'In Vorbereitung',
    'orders.ready': 'Fertig',
    'orders.completed': 'Abgeschlossen',
    'orders.cancelled': 'Storniert',
    
    // Favorites
    'favorites.title': 'Favoriten',
    'favorites.empty': 'Keine Favoriten',
    'favorites.removed': 'Aus Favoriten entfernt',
    
    // Help & Support
    'help.title': 'Hilfe & Support',
    'help.faq': 'Häufig gestellte Fragen',
    'help.contact': 'Support kontaktieren',
    'help.subject': 'Betreff',
    'help.message': 'Nachricht',
    'help.send': 'Senden',
    'help.messageSent': 'Nachricht gesendet',
    
    // Track Order
    'track.title': 'Bestellung verfolgen',
    'track.orderNumber': 'Bestellnummer',
    'track.estimatedTime': 'Geschätzte Zeit',
    'track.minutes': 'Min',
    'track.inQueue': 'In der Warteschlange',
    'track.preparing': 'In Vorbereitung',
    'track.readyPickup': 'Abholbereit',
    
    // Status
    'status.offer': 'ANGEBOT',
    'status.fastQueue': 'SCHNELLE WARTESCHLANGE',
    'status.saturated': 'WARTESCHLANGE VOLL',
    
    // Languages
    'lang.spanish': 'Español',
    'lang.english': 'English',
    'lang.french': 'Français',
    'lang.german': 'Deutsch',
    'lang.arabic': 'العربية',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.offers': 'العروض',
    'nav.cart': 'السلة',
    'nav.profile': 'الملف الشخصي',
    
    // Common
    'common.back': 'رجوع',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.remove': 'إزالة',
    'common.close': 'إغلاق',
    'common.confirm': 'تأكيد',
    
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.logout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    
    // Home
    'home.foodtrucks': 'شاحنات الطعام',
    'home.bars': 'الحانات',
    'home.selectService': 'اختر خدمة',
    
    // Cart
    'cart.title': 'سلتي',
    'cart.empty': 'سلتك فارغة',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.delivery': 'التوصيل',
    'cart.total': 'الإجمالي',
    'cart.checkout': 'الدفع',
    'cart.addedToCart': 'تمت الإضافة إلى السلة',
    'cart.applyCoupon': 'تطبيق القسيمة',
    
    // Profile
    'profile.title': 'ملفي الشخصي',
    'profile.personalInfo': 'المعلومات الشخصية',
    'profile.paymentMethods': 'طرق الدفع',
    'profile.orderHistory': 'طلباتي',
    'profile.favorites': 'المفضلة',
    'profile.helpSupport': 'المساعدة والدعم',
    'profile.language': 'اللغة',
    'profile.reviews': 'My reviews',

    // Reviews
    'reviews.title': 'Reviews',
    'reviews.myTitle': 'My reviews',
    'reviews.verifiedOrders': 'Verified opinions from real orders',
    'reviews.mySubtitle': 'All the reviews you have published',
    'reviews.myListSubtitle': 'You will also see the royalties earned for each one.',
    'reviews.defaultTitle': 'Reviews',
    'reviews.noReviews': 'There are no reviews to show yet.',
    'reviews.countSuffix': 'reviews',
    'reviews.seeAll': 'See all',
    'reviews.writeTitle': 'Write a review',
    'reviews.orderNotFoundTitle': 'Order not found',
    'reviews.orderNotFoundBody': 'We could not prepare the review for this order.',
    'reviews.alreadyReviewedTitle': 'This order has already been reviewed',
    'reviews.alreadyReviewedBody': 'Each order can have only one review.',
    'reviews.viewMyReviews': 'View my reviews',
    'reviews.generalSectionTitle': 'General rating',
    'reviews.generalSectionSubtitle': 'Only the general stars are required.',
    'reviews.generalStars': 'General stars',
    'reviews.comment': 'Comment',
    'reviews.commentPlaceholder': 'Tell us how the experience went...',
    'reviews.commentBonus': '+20 points if you write at least 10 characters.',
    'reviews.optionalConceptsTitle': 'Optional concepts',
    'reviews.optionalConceptsSubtitle': 'Completing the three ratings adds +20 points.',
    'reviews.service': 'Service',
    'reviews.staff': 'Staff',
    'reviews.speed': 'Speed',
    'reviews.orderProductsTitle': 'Order products',
    'reviews.orderProductsSubtitle': 'You can rate specific products. They add +20 points each, maximum 3.',
    'reviews.quantity': 'Quantity',
    'reviews.rate': 'Rate',
    'reviews.productStars': 'Product stars',
    'reviews.productCommentPlaceholder': 'Optional comment about this product',
    'reviews.estimatedRoyalties': 'Estimated royalties',
    'reviews.publish': 'Publish review',
    'reviews.requiredGeneral': 'General stars are required',
    'reviews.savedToast': 'Review saved. You earned',
    'reviews.productTitle': 'Product reviews',
    'reviews.productSubtitle': 'Verified opinions from people who ordered it.',
    'reviews.foodTruckTitle': 'Food truck reviews',
    'reviews.foodTruckSubtitle': 'Verified opinions from orders placed here.',
    'reviews.barTitle': 'Bar reviews',
    'reviews.barSubtitle': 'Verified opinions from orders placed here.',
    'reviews.reviewProduct': 'Review this product',
    'reviews.reviewProductAlready': 'You have no pending orders to review',
    'reviews.reviewProductLocked': 'Order it once to review it',
    'reviews.orderConfirmationCta': 'Review order and earn royalties',
    'reviews.starAria': 'stars',
    
    // Personal Info
    'personalInfo.title': 'المعلومات الشخصية',
    'personalInfo.name': 'الاسم',
    'personalInfo.email': 'البريد الإلكتروني',
    'personalInfo.phone': 'الهاتف',
    'personalInfo.saveChanges': 'حفظ التغييرات',
    'personalInfo.saved': 'تم حفظ التغييرات',
    
    // Payment Methods
    'payment.title': 'طرق الدفع',
    'payment.addCard': 'إضافة بطاقة',
    'payment.default': 'افتراضي',
    'payment.setDefault': 'تعيين كافتراضي',
    'payment.expiresOn': 'تنتهي في',
    'payment.cardRemoved': 'تمت إزالة البطاقة',
    
    // Order History
    'orders.title': 'طلباتي',
    'orders.orderNumber': 'رقم الطلب',
    'orders.date': 'التاريخ',
    'orders.total': 'الإجمالي',
    'orders.status': 'الحالة',
    'orders.empty': 'لا توجد طلبات',
    'orders.pending': 'قيد الانتظار',
    'orders.preparing': 'قيد التحضير',
    'orders.ready': 'جاهز',
    'orders.completed': 'مكتمل',
    'orders.cancelled': 'ملغى',
    
    // Favorites
    'favorites.title': 'المفضلة',
    'favorites.empty': 'لا توجد مفضلة',
    'favorites.removed': 'تمت الإزالة من المفضلة',
    
    // Help & Support
    'help.title': 'المساعدة والدعم',
    'help.faq': 'الأسئلة الشائعة',
    'help.contact': 'الاتصال بالدعم',
    'help.subject': 'الموضوع',
    'help.message': 'الرسالة',
    'help.send': 'إرسال',
    'help.messageSent': 'تم إرسال الرسالة',
    
    // Track Order
    'track.title': 'تتبع الطلب',
    'track.orderNumber': 'رقم الطلب',
    'track.estimatedTime': 'الوقت المقدر',
    'track.minutes': 'دقيقة',
    'track.inQueue': 'في الانتظار',
    'track.preparing': 'قيد التحضير',
    'track.readyPickup': 'جاهز للاستلام',
    
    // Status
    'status.offer': 'عرض',
    'status.fastQueue': 'طابور سريع',
    'status.saturated': 'طابور ممتلئ',
    
    // Languages
    'lang.spanish': 'Español',
    'lang.english': 'English',
    'lang.french': 'Français',
    'lang.german': 'Deutsch',
    'lang.arabic': 'العربية',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'es';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    
    // Set RTL direction for Arabic
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
