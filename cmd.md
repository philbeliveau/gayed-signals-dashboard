
  cd /Users/philippebeliveau/Desktop/Notebook/Trading-system/gayed-signals-dashboard && npm run dev

  Le serveur est déjà en cours d'exécution ! 🎉

  D'après les logs, votre dashboard est accessible à :
  - Local: http://localhost:3000
  - Réseau: http://192.168.0.199:3000

  Essayez d'ouvrir : http://localhost:3000

  Si vous voyez encore "ERR_CONNECTION_REFUSED", essayez ces solutions :

  1. Vérifiez si le serveur tourne :
  curl http://localhost:3000

  2. Redémarrez complètement :
  # Ctrl+C pour arrêter le serveur actuel, puis :
  cd /Users/philippebeliveau/Desktop/Notebook/Trading-system/gayed-signals-dashboard
  npm run dev

  3. Essayez l'adresse réseau :
  http://192.168.0.199:3000

  Le dashboard devrait afficher l'interface avec les 5 signaux de Gayed, même si certaines données sont en mode dégradé (ce qui est normal avec les
  API externes).
