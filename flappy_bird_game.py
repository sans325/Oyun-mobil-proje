import pygame
import random
import sys
import os
from enum import Enum

# Pygame başlat
pygame.init()

# ==================== AYARLAR ====================
class GameConfig:
    """Oyun ayarları"""
    WIDTH = 400
    HEIGHT = 600
    FPS = 60
    
    # Fizik
    GRAVITY = 0.4
    MAX_DROP_SPEED = 12
    JUMP_POWER = -9
    
    # Borular
    PIPE_WIDTH = 60
    GAP_SIZE = 120
    PIPE_SPEED = 5
    PIPE_SPAWN_RATE = 90
    
    # Renkler
    COLORS = {
        'SKY_BLUE': (135, 206, 235),
        'DARK_BLUE': (30, 144, 255),
        'PIPE_DARK': (34, 139, 34),
        'PIPE_LIGHT': (144, 238, 144),
        'BIRD_YELLOW': (255, 255, 0),
        'BIRD_ORANGE': (255, 165, 0),
        'BLACK': (0, 0, 0),
        'WHITE': (255, 255, 255),
        'RED': (255, 0, 0),
        'GOLD': (255, 215, 0),
    }


class GameState(Enum):
    """Oyun durumları"""
    MENU = 1
    PLAYING = 2
    GAME_OVER = 3
    PAUSED = 4


# ==================== KUŞU ÇIZME FONKSIYONU ====================
class BirdGraphics:
    """Kuş grafikleri"""
    
    @staticmethod
    def draw_bird(surface, x, y, wing_position=0):
        """Kuşu kanatları hareket ederek çiz"""
        size = 40
        center_x = x + size // 2
        center_y = y + size // 2
        
        # Gövde (sarı)
        pygame.draw.circle(surface, GameConfig.COLORS['BIRD_YELLOW'], 
                         (center_x, center_y), 15)
        
        # Kanatlar (turuncu)
        wing_offset = 8 * abs(wing_position)
        # Sol kanat
        pygame.draw.polygon(surface, GameConfig.COLORS['BIRD_ORANGE'],
                          [(center_x - 18, center_y - 5 + wing_offset),
                           (center_x - 12, center_y + 8),
                           (center_x - 8, center_y - 3 + wing_offset)])
        
        # Sağ kanat
        pygame.draw.polygon(surface, GameConfig.COLORS['BIRD_ORANGE'],
                          [(center_x + 18, center_y - 5 + wing_offset),
                           (center_x + 12, center_y + 8),
                           (center_x + 8, center_y - 3 + wing_offset)])
        
        # Gözler
        pygame.draw.circle(surface, GameConfig.COLORS['BLACK'], 
                         (center_x + 8, center_y - 4), 4)
        pygame.draw.circle(surface, GameConfig.COLORS['WHITE'], 
                         (center_x + 9, center_y - 5), 2)
        
        # Gaga (kırmızı)
        pygame.draw.polygon(surface, GameConfig.COLORS['RED'],
                          [(center_x + 15, center_y),
                           (center_x + 22, center_y - 2),
                           (center_x + 15, center_y + 4)])


# ==================== KUŞU SINIFI ====================
class Bird(pygame.sprite.Sprite):
    """Oyuncunun kontrolü altındaki kuş"""
    
    def __init__(self, x, y):
        super().__init__()
        self.x = x
        self.y = y
        self.velocity = 0
        self.width = 40
        self.height = 40
        self.wing_animation = 0
        self.wing_speed = 0.2
        
    def update(self):
        """Kuşu fizik kurallarına göre güncelle"""
        self.velocity += GameConfig.GRAVITY
        self.velocity = min(self.velocity, GameConfig.MAX_DROP_SPEED)
        self.y += self.velocity
        
        # Kanat animasyonu
        self.wing_animation += self.wing_speed
        if self.wing_animation > 1:
            self.wing_animation = -1
    
    def jump(self):
        """Zıpla"""
        self.velocity = GameConfig.JUMP_POWER
    
    def draw(self, surface):
        """Kuşu çiz"""
        rect = pygame.Rect(self.x, self.y, self.width, self.height)
        pygame.draw.rect(surface, (240, 240, 240), rect)  # Arka plan
        BirdGraphics.draw_bird(surface, self.x, self.y, self.wing_animation)
    
    def get_rect(self):
        """Çarpışma için dikdörtgen döndür"""
        return pygame.Rect(self.x + 8, self.y + 8, 24, 24)


# ==================== BORU SINIFI ====================
class Pipe:
    """Engel boruları"""
    
    def __init__(self, x, pipe_height):
        self.x = x
        self.pipe_height = pipe_height
        self.gap_size = GameConfig.GAP_SIZE
        self.width = GameConfig.PIPE_WIDTH
        self.speed = GameConfig.PIPE_SPEED
        self.passed = False
        self.score_value = 1
    
    def update(self):
        """Boruyu hareket ettir"""
        self.x -= self.speed
    
    def draw(self, surface):
        """Boruları çiz"""
        # Üst boru
        pygame.draw.rect(surface, GameConfig.COLORS['PIPE_DARK'],
                        (self.x, 0, self.width, self.pipe_height))
        pygame.draw.rect(surface, GameConfig.COLORS['PIPE_LIGHT'],
                        (self.x, self.pipe_height - 12, self.width, 12))
        
        # Alt boru
        bottom_y = self.pipe_height + self.gap_size
        pygame.draw.rect(surface, GameConfig.COLORS['PIPE_DARK'],
                        (self.x, bottom_y, self.width, 
                         GameConfig.HEIGHT - bottom_y))
        pygame.draw.rect(surface, GameConfig.COLORS['PIPE_LIGHT'],
                        (self.x, bottom_y, self.width, 12))
    
    def check_collision(self, bird):
        """Kuş ile çarpışma kontrol et"""
        bird_rect = bird.get_rect()
        
        if bird_rect.right > self.x and bird_rect.left < self.x + self.width:
            if bird_rect.top < self.pipe_height or \
               bird_rect.bottom > self.pipe_height + self.gap_size:
                return True
        
        return False
    
    def is_off_screen(self):
        """Ekrandan çıktı mı"""
        return self.x + self.width < 0


# ==================== PARÇACIK SİSTEMİ ====================
class Particle:
    """Efekt için parçacıklar"""
    
    def __init__(self, x, y, vx, vy, color, life):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.color = color
        self.life = life
        self.max_life = life
    
    def update(self):
        """Parçacığı güncelle"""
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.2
        self.life -= 1
    
    def draw(self, surface):
        """Parçacığı çiz"""
        alpha = int(255 * (self.life / self.max_life))
        size = max(2, int(4 * (self.life / self.max_life)))
        pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), size)
    
    def is_alive(self):
        """Parçacık hala aktif mi"""
        return self.life > 0


# ==================== OYUN SINIFI ====================
class FlappyBirdGame:
    """Ana oyun sınıfı"""
    
    def __init__(self):
        self.screen = pygame.display.set_mode(
            (GameConfig.WIDTH, GameConfig.HEIGHT)
        )
        pygame.display.set_caption("🐦 Flappy Bird - Geliştirilmiş Sürüm")
        self.clock = pygame.time.Clock()
        
        # Fontlar
        self.font_large = pygame.font.Font(None, 72)
        self.font_medium = pygame.font.Font(None, 48)
        self.font_small = pygame.font.Font(None, 32)
        self.font_tiny = pygame.font.Font(None, 24)
        
        self.reset()
    
    def reset(self):
        """Oyunu sıfırla"""
        self.state = GameState.MENU
        self.bird = Bird(50, GameConfig.HEIGHT // 2)
        self.pipes = []
        self.particles = []
        self.score = 0
        self.best_score = 0
        self.pipe_counter = 0
        self.frame_count = 0
    
    def spawn_pipe(self):
        """Yeni boru oluştur"""
        min_height = 50
        max_height = GameConfig.HEIGHT - GameConfig.GAP_SIZE - 50
        pipe_height = random.randint(min_height, max_height)
        self.pipes.append(Pipe(GameConfig.WIDTH, pipe_height))
    
    def create_particles(self, x, y, color, count=5):
        """Parçacık efekti oluştur"""
        for _ in range(count):
            angle = random.uniform(0, 2 * 3.14159)
            speed = random.uniform(2, 5)
            vx = speed * (angle ** 0.5)
            vy = speed * (-angle ** 0.5)
            self.particles.append(
                Particle(x, y, vx, vy, color, random.randint(15, 30))
            )
    
    def handle_input(self):
        """Girdileri işle"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    if self.state == GameState.MENU:
                        self.state = GameState.PLAYING
                        self.bird = Bird(50, GameConfig.HEIGHT // 2)
                        self.pipes = []
                        self.score = 0
                    elif self.state == GameState.PLAYING:
                        self.bird.jump()
                        self.create_particles(self.bird.x + 20, 
                                            self.bird.y + 20,
                                            GameConfig.COLORS['BIRD_YELLOW'], 3)
                    elif self.state == GameState.GAME_OVER:
                        self.state = GameState.MENU
                
                if event.key == pygame.K_p and self.state == GameState.PLAYING:
                    self.state = GameState.PAUSED
                elif event.key == pygame.K_p and self.state == GameState.PAUSED:
                    self.state = GameState.PLAYING
            
            if event.type == pygame.MOUSEBUTTONDOWN:
                if self.state == GameState.PLAYING:
                    self.bird.jump()
                    self.create_particles(self.bird.x + 20, self.bird.y + 20,
                                        GameConfig.COLORS['BIRD_YELLOW'], 3)
        
        return True
    
    def update(self):
        """Oyunu güncelle"""
        if self.state != GameState.PLAYING:
            return
        
        # Kuşu güncelle
        self.bird.update()
        
        # Boruları güncelle
        for pipe in self.pipes[:]:
            pipe.update()
            
            # Çarpışma kontrolü
            if pipe.check_collision(self.bird):
                self.state = GameState.GAME_OVER
                self.best_score = max(self.best_score, self.score)
                self.create_particles(self.bird.x + 20, self.bird.y + 20,
                                    GameConfig.COLORS['RED'], 10)
            
            # Puan kontrolü
            if not pipe.passed and pipe.x + pipe.width < self.bird.x:
                pipe.passed = True
                self.score += pipe.score_value
                self.create_particles(GameConfig.WIDTH // 2, 50,
                                    GameConfig.COLORS['GOLD'], 5)
            
            # Eski boruları sil
            if pipe.is_off_screen():
                self.pipes.remove(pipe)
        
        # Yeni boru oluştur
        self.pipe_counter += 1
        if self.pipe_counter >= GameConfig.PIPE_SPAWN_RATE:
            self.spawn_pipe()
            self.pipe_counter = 0
        
        # Ekran sınırlarını kontrol et
        if self.bird.y <= 0 or self.bird.y + self.bird.height >= GameConfig.HEIGHT:
            self.state = GameState.GAME_OVER
            self.best_score = max(self.best_score, self.score)
        
        # Parçacıkları güncelle
        for particle in self.particles[:]:
            particle.update()
            if not particle.is_alive():
                self.particles.remove(particle)
    
    def draw(self):
        """Oyunu çiz"""
        # Arka plan
        self.screen.fill(GameConfig.COLORS['DARK_BLUE'])
        
        # Gradyan efekti (basit)
        for y in range(GameConfig.HEIGHT):
            color_val = int(135 + (100 * (y / GameConfig.HEIGHT)))
            pygame.draw.line(self.screen, 
                           (color_val - 50, color_val, color_val),
                           (0, y), (GameConfig.WIDTH, y))
        
        # Boruları çiz
        for pipe in self.pipes:
            pipe.draw(self.screen)
        
        # Kuşu çiz
        self.bird.draw(self.screen)
        
        # Parçacıkları çiz
        for particle in self.particles:
            particle.draw(self.screen)
        
        # Puanı çiz
        score_text = self.font_large.render(str(self.score), True, 
                                           GameConfig.COLORS['WHITE'])
        self.screen.blit(score_text, (GameConfig.WIDTH // 2 - 25, 20))
        
        # Menü
        if self.state == GameState.MENU:
            self.draw_menu()
        
        # Oyun bittiyse
        elif self.state == GameState.GAME_OVER:
            self.draw_game_over()
        
        # Duraklatılmışsa
        elif self.state == GameState.PAUSED:
            self.draw_paused()
        
        pygame.display.flip()
    
    def draw_menu(self):
        """Menüyü çiz"""
        overlay = pygame.Surface((GameConfig.WIDTH, GameConfig.HEIGHT))
        overlay.set_alpha(220)
        overlay.fill(GameConfig.COLORS['BLACK'])
        self.screen.blit(overlay, (0, 0))
        
        title = self.font_large.render("🐦 FLAPPY BIRD", True, 
                                      GameConfig.COLORS['GOLD'])
        self.screen.blit(title, 
                        (GameConfig.WIDTH // 2 - title.get_width() // 2, 100))
        
        if self.best_score > 0:
            best_text = self.font_small.render(
                f"Best Score: {self.best_score}", True, 
                GameConfig.COLORS['GOLD'])
            self.screen.blit(best_text,
                           (GameConfig.WIDTH // 2 - best_text.get_width() // 2, 200))
        
        start_text = self.font_medium.render("Press SPACE to Start", True,
                                            GameConfig.COLORS['WHITE'])
        self.screen.blit(start_text,
                        (GameConfig.WIDTH // 2 - start_text.get_width() // 2, 350))
        
        controls = self.font_tiny.render("SPACE/CLICK to Jump | P to Pause", True,
                                        GameConfig.COLORS['WHITE'])
        self.screen.blit(controls,
                        (GameConfig.WIDTH // 2 - controls.get_width() // 2, 500))
    
    def draw_game_over(self):
        """Oyun bitti ekranını çiz"""
        overlay = pygame.Surface((GameConfig.WIDTH, GameConfig.HEIGHT))
        overlay.set_alpha(220)
        overlay.fill(GameConfig.COLORS['BLACK'])
        self.screen.blit(overlay, (0, 0))
        
        game_over_text = self.font_large.render("GAME OVER", True,
                                               GameConfig.COLORS['RED'])
        self.screen.blit(game_over_text,
                        (GameConfig.WIDTH // 2 - game_over_text.get_width() // 2, 150))
        
        score_text = self.font_medium.render(f"Score: {self.score}", True,
                                            GameConfig.COLORS['GOLD'])
        self.screen.blit(score_text,
                        (GameConfig.WIDTH // 2 - score_text.get_width() // 2, 280))
        
        best_text = self.font_small.render(f"Best: {self.best_score}", True,
                                          GameConfig.COLORS['WHITE'])
        self.screen.blit(best_text,
                        (GameConfig.WIDTH // 2 - best_text.get_width() // 2, 360))
        
        restart = self.font_small.render("Press SPACE to Restart", True,
                                        GameConfig.COLORS['WHITE'])
        self.screen.blit(restart,
                        (GameConfig.WIDTH // 2 - restart.get_width() // 2, 450))
    
    def draw_paused(self):
        """Duraklatma ekranını çiz"""
        overlay = pygame.Surface((GameConfig.WIDTH, GameConfig.HEIGHT))
        overlay.set_alpha(150)
        overlay.fill(GameConfig.COLORS['BLACK'])
        self.screen.blit(overlay, (0, 0))
        
        paused_text = self.font_large.render("PAUSED", True,
                                            GameConfig.COLORS['GOLD'])
        self.screen.blit(paused_text,
                        (GameConfig.WIDTH // 2 - paused_text.get_width() // 2, 250))
        
        resume = self.font_small.render("Press P to Resume", True,
                                       GameConfig.COLORS['WHITE'])
        self.screen.blit(resume,
                        (GameConfig.WIDTH // 2 - resume.get_width() // 2, 380))
    
    def run(self):
        """Oyun döngüsü"""
        running = True
        while running:
            running = self.handle_input()
            self.update()
            self.draw()
            self.clock.tick(GameConfig.FPS)
        
        pygame.quit()
        sys.exit()


# ==================== ANA PROGRAM ====================
if __name__ == "__main__":
    game = FlappyBirdGame()
    game.run()
