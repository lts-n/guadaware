import pickle
class Note:
    def __init__(self, title, content):
        self.title = title
        self.content = content
    def update(self):
        with open("notes.pkl", "rb") as f:
            notes = pickle.load(f)
        notes.append(self)
        with open("notes.pkl", "wb") as f:
            pickle.dump(notes, f)
    def delete(self):
        with open("notes.pkl", "rb") as f:
            notes = pickle.load(f)
        notes.remove(self)
        with open("notes.pkl", "wb") as f:
            pickle.dump(notes, f)
    def setName(self, name):
        self.title = name
    def setContent(self, content):
        self.content = content
    def getName(self):
        return self.title
    def getContent(self):
        return self.content
