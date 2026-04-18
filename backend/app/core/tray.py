import pystray
from pystray import MenuItem as item
from PIL import Image
import webbrowser
import os
import sys

def resource_path(relative_path):
    base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    return os.path.join(base_path, relative_path)

class SystemTrayApp:
    def __init__(self):
        self.icon = None

    def open_browser(self):
        webbrowser.open("http://localhost:8000")

    def exit_app(self, icon, item):
        icon.stop()
        os._exit(0)

    def run_tray(self):
        icon_path = resource_path("icon.png")
        if not os.path.exists(icon_path):
            image = Image.new('RGB', (64, 64), color=(99, 102, 241))
        else:
            image = Image.open(icon_path)

        menu = pystray.Menu(
            item('Abrir Sistema', self.open_browser, default=True),
            item('Verificar Status', lambda: webbrowser.open("http://localhost:8000/api/health")),
            pystray.Menu.SEPARATOR,
            item('Sair', self.exit_app)
        )

        self.icon = pystray.Icon("leitura_digital", image, "Leitura Digital", menu)
        self.icon.run()
