import webbrowser

class Movie():
    def __init__(self, title, storyline, poster_image, trailer_youtube):
        self.title = title
        self.storyline = storyline
        self.poster_image = poster_image
        self.trailer_youtube = trailer_youtube

    def show_trailer(self):
        webbrowser.open(self.trailer_youtube)


