import media
import fresh_tomatoes

toy_story = media.Movie("Toy Story",
        "A story of a boy and his toys that come to life",
        "http://upload.wikimedia.org/wikipedia/en/1/13/Toy_Story.jpg", 
        "https://www.youtube.com/watch?v=KYz2wyBy3kc")

avatar = media.Movie(
        "Avatar",
        "A marine on an alien planet",
        "http://upload.wikimedia.org/wikipedia/en/b/b0/Avatar-Teaser-Poster.jpg",
        "https://www.youtube.com/watch?v=cRdxXPV9GNQ")

rurouni_kenshin = media.Movie(
        "Rurouni Kenshin",
        "The story of a wanderer named Himura Kenshin, formerly known as the assassin Hitokiri Battosai",
        "http://upload.wikimedia.org/wikipedia/en/f/f6/Rurouni_Kenshin_%282012_film%29_poster.jpg",
        "https://www.youtube.com/watch?v=lc_JmcRxdx8")

hunger_games = media.Movie(
        "The Hunger Games",
        "A real reality show",
        "http://upload.wikimedia.org/wikipedia/en/4/42/HungerGamesPoster.jpg",
        "https://www.youtube.com/watch?v=4S9a5V9ODuY")

taken = media.Movie(
        "Taken",
        "A former CIA operative named Bryan Mills who sets about tracking down his daughter after she is kidnapped by human traffickers for sexual slavery while travelling in France",
        "http://upload.wikimedia.org/wikipedia/en/e/ed/Taken_film_poster.jpg",
        "https://www.youtube.com/watch?v=wCbDUREBwUg")

gone_girl = media.Movie(
        "Gone Girl",
        "A mystery about a man whose wife has gone missing and the events after",
        "http://upload.wikimedia.org/wikipedia/en/0/05/Gone_Girl_Poster.jpg",
        "https://www.youtube.com/watch?v=2-_-1nJf8Vg")

movies = [toy_story, avatar, rurouni_kenshin, hunger_games, taken, gone_girl]
fresh_tomatoes.open_movies_page(movies)
