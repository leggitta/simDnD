import numpy as np

verbose = False

class Encounter:
    def __init__(self, combatants=[]):
        self.combatants = combatants
        self.turn_counter = 1

    def roll_initiative(self):
        
        # each combatant in the encounter rolls initiative
        initiative_rolls = []
        for c in self.combatants:
            initiative_rolls.append(c.roll_initiative())
        
        # check for ties and re-roll to break ties
        w = 100
        while len(initiative_rolls) > len(np.unique(initiative_rolls)):
            for i in range(len(initiative_rolls)):
                initiative_rolls[i] += self.combatants[i].roll_initiative() / w
            w *= 100
        
        # compute combatant order
        order = np.array(self.combatants)[np.argsort(initiative_rolls)[::-1]].tolist()
        self.order = order
        return order
    

class Character:
    def __init__(self, data, position=(0, 0), team='heroes', name=None):
        self.data = data                            # character data (from excel)
        self.position = position                    # starting position
        self.team = team                            # team (currently heroes or monsters)
        self.current_hp = self.data['Hit Points']   # current hit points
        self.resistant = False
        self.prone = False
        self.save_advantages = []
        
        # determine display name
        if name is None:
            self.name = self.data['Name']
        else:
            self.name = name
        
    def __repr__(self):
        return self.name
    
    def save(self, ability, dc):  
        ability_score = self.data[ability]
        ability_mod = np.floor((ability_score - 10) / 2)
        
        if [ability] in self.save_advantages:
            if verbose:
                print('%s has advange on %s saves' % (self, ability))
            roll = max(np.random.randint(0, 20, 2)) + 1 + ability_mod
        else:
            roll = np.random.randint(20) + 1 + ability_mod
        
        if roll >= dc:
            return True
        else:
            return False
    
    def turn(self, encounter):
        if self.current_hp < 1:
            return
        
        # evaluate nearest target
        distance, target = self.nearest_target(encounter)
        if target is None:
            return
        
        # determine if ranged attack available
        standard_range = 5
        max_range = 5
        if '/' in str(self.data['Range']):
            # ranged weapon exists!
            standard_range, max_range = self.data['Range'].split('/')
            standard_range = int(standard_range)
            max_range = int(max_range)
        elif self.data['Range'] > 0:
            standard_range = self.data['Range']
        
        # move to target
        if distance > max_range:
            self.move(destination=target.position)
            
        # take action
        if distance > max_range:
            # dash action
            if verbose:
                print('%s dashes to %s' % (self, target))
            self.move(destination=target.position)
        else:
            # melee attack action
            self.melee_attack(target)
        
    
    def nearest_target(self, encounter):
        distance = 9e9
        target = None
        for c in encounter.combatants:
            if c.team == self.team:
                continue
            elif c.current_hp < 1:
                continue
            else:
                r = np.sqrt((self.position[0] - c.position[0])**2 + (self.position[1] - c.position[1])**2)
                if r < distance:
                    target = c
                    distance = r
        return distance, target

    def nearest_ally(self, encounter):
        distance = 9e9
        ally = None
        for c in encounter.combatants:
            if c.team != self.team:
                continue
            elif c.current_hp < 1:
                continue
            elif self == c:
                continue
            else:
                r = np.sqrt((self.position[0] - c.position[0])**2 + (self.position[1] - c.position[1])**2)
                if r < distance:
                    ally = c
                    distance = r
        return distance, ally
    
    def roll_initiative(self):
        val = np.random.randint(20) + 1 + self.data['Initiative']
        if verbose:
            print('%s rolled initiative: %d' % (self, val))
        return val
    
    def move(self, destination):
        x0, y0 = self.position
        xf, yf = destination
        dx = xf - x0
        dy = yf - y0
        
        # compute distance
        r = np.sqrt(dx**2 + dy**2)
        
        # compute angle
        phi = np.arctan2(dy, dx)
        
        R = self.data['Move']
        
        if R > r:
            R = r
        dX = R*np.cos(phi)
        dY = R*np.sin(phi)
        x0 += dX
        y0 += dY
        
        if verbose:
            print('%s moves %d feet to (%d, %d)' % (self, R, x0, y0))
        self.position = (x0, y0)
        
    
    def ranged_attack(self, target, disadvantage=False, advantage=False):
        if verbose:
            print('%s shoots %s' % (self, target))
        
        # determine weapons
        if ';' in str(self.data['Ranged']):
            attack_mod = int(self.data['Ranged'].split(';')[0])
            damage_string = self.data['Ranged Damage'].split(';')[0].lower()
        else:
            attack_mod = int(self.data['Ranged'])
            damage_string = self.data['Ranged Damage'].lower()
        
        # determine damage modification
        if '+' in damage_string:
            damage_dice, damage_mod = damage_string.split('+')
            damage_mod = int(damage_mod)
        elif '-' in damage_string:
            damage_dice, damage_mod = damage_string.split('-')
            damage_mod = -int(damage_mod)
        else:
            damage_dice = damage_string
            damage_mod = 0
        
        # determine damage dice
        if damage_dice[0] == 'd':
            n_damage_dice = 1
            damage_die = int(damage_dice[1:])
        else:
            n_damage_dice, damage_die = damage_dice.split('d')
            n_damage_dice = int(n_damage_dice)
            damage_die = int(damage_die)
        
        # roll for damage
        damage = damage_mod
        for n in range(n_damage_dice):
            roll = np.random.randint(damage_die) + 1
            damage += roll
        
        # roll attack
        if advantage:
            attack_roll = max(np.random.randint(0, 20, 2)) + 1 + attack_mod
        elif disadvantage:
            attack_roll = min(np.random.randint(0, 20, 2)) + 1 + attack_mod
        else:
            attack_roll = np.random.randint(20) + 1 + attack_mod

        # check target armor class
        if attack_roll >= target.data['Armor Class']:
            target.current_hp -= damage
            if verbose:
                print('Attack roll: %d. Hit!' % attack_roll)
                print('Damage: %dd%d+%d: %d' % (n_damage_dice, damage_die, damage_mod, damage))
                print('%s has %d hit points left' % (target, target.current_hp))
        else:
            if verbose:
                print('Attack roll: %d. Miss!' % attack_roll)
        
        # update ammo
        self.data['Ammo'] -= 1
        if verbose:
            print('%s has %d shots left' % (self, self.data['Ammo']))
        
    
    def melee_attack(self, target, disadvantage=False, advantage=False):
        if verbose:
            print('%s attacks %s' % (self, target))
        
        # determine weapons
        if ';' in str(self.data['Melee']):
            attack_mod = int(self.data['Melee'].split(';')[0])
            damage_string = self.data['Melee Damage'].split(';')[0].lower()
        else:
            attack_mod = int(self.data['Melee'])
            damage_string = self.data['Melee Damage'].lower()
        
        # determine damage modification
        if '+' in damage_string:
            damage_dice, damage_mod = damage_string.split('+')
            damage_mod = int(damage_mod)
        elif '-' in damage_string:
            damage_dice, damage_mod = damage_string.split('-')
            damage_mod = -int(damage_mod)
        else:
            damage_dice = damage_string
            damage_mod = 0
        
        # determine damage dice
        if damage_dice[0] == 'd':
            n_damage_dice = 1
            damage_die = int(damage_dice[1:])
        else:
            n_damage_dice, damage_die = damage_dice.split('d')
            n_damage_dice = int(n_damage_dice)
            damage_die = int(damage_die)
        
        # roll for damage
        damage = damage_mod
        for n in range(n_damage_dice):
            roll = np.random.randint(damage_die) + 1
            damage += roll
        
        # check for resistance
        if target.resistant:
            if verbose:
                print('%s is resistant to your attack' % target)
            damage = np.round(damage/2)
        
        # check for prone
        if target.prone:
            if disadvantage:
                disadvantage = False
            else:
                advantage = True
        
        # roll attack
        if advantage:
            attack_roll = max(np.random.randint(0, 20, 2)) + 1 + attack_mod
        elif disadvantage:
            attack_roll = min(np.random.randint(0, 20, 2)) + 1 + attack_mod
        else:
            attack_roll = np.random.randint(20) + 1 + attack_mod

        # check target armor class
        if attack_roll >= target.data['Armor Class']:
            target.current_hp -= damage
            if verbose:
                print('Attack roll: %d. Hit!' % attack_roll)
                print('Damage: %dd%d+%d: %d' % (n_damage_dice, damage_die, damage_mod, damage))
                print('%s has %d hit points left' % (target, target.current_hp))
        else:
            if verbose:
                print('Attack roll: %d. Miss!' % attack_roll)

            
            
class Barbarian(Character):
    def turn(self, encounter):
        if self.current_hp < 1:
            return
        
        # evaluate nearest target
        distance, target = self.nearest_target(encounter)
        if target is None:
            return
        
        # determine if ranged attack available
        standard_range = 5
        max_range = 5
        if '/' in str(self.data['Range']):
            # ranged weapon exists!
            standard_range, max_range = self.data['Range'].split('/')
            standard_range = int(standard_range)
            max_range = int(max_range)
            ammo = self.data['Ammo']
        elif self.data['Range'] > 0:
            standard_range = self.data['Range']
            max_range = self.data['Range']
            ammo = self.data['Ammo']
        
        # move to target
        if distance > max_range:
            self.move(destination=target.position)
        
        # rage
        if distance <= 5:
            self.start_rage()
        
        # take action
        if (distance > max_range) or (distance > 5 and ammo < 1):
            # dash action
            if verbose:
                print('%s dashes to %s' % (self, target))
            self.move(destination=target.position)
        elif distance > 5 and distance <= max_range and distance > standard_range and ammo > 0:
            self.ranged_attack(target, disadvantage=True)
        elif distance > 5 and distance <= standard_range and ammo > 0:
            self.ranged_attack(target)
        elif distance <= 5:
            # melee attack action
            self.melee_attack(target)

    def start_rage(self):
        if verbose:
            print('%s goes into a rage' % self)
        self.rage = True
        
        # update melee damage
        melee_damage = self.data['Melee Damage']
        if '+' in melee_damage:
            s, dam = melee_damage.split('+')
            dam = int(dam) + 2
            melee_damage = '%s+%d' % (s, dam)
        elif '-' in melee_damage:
            s, dam = melee_damage.split('-')
            dam = -int(dam) + 2
            if dam < 0:
                melee_damage = '%s-%d' % (s, abs(dam))
            else:
                melee_damage = '%s+%d' % (s, dam)
        else:
            melee_damage = melee_damage + '+2'
        self.data['Melee Damage'] = melee_damage
        
        # update resistance
        self.resistant = True
        
        # update saves
        self.save_advantages += ['Strength']
    
        
class Wolf(Character):
    def turn(self, encounter):
        if self.current_hp < 1:
            if verbose:
                print('%s is unconscious' % self)
            return
        
        # evaluate nearest target
        distance, target = self.nearest_target(encounter)
        if target is None:
            return
        
        max_range = 5
        
        # move to target
        if distance > max_range:
            self.move(destination=target.position)

        # evaluate nearest ally
        advantage = False
        ally_distance, ally = self.nearest_ally(encounter)
        if ally_distance <= 5:
            advantage = True
            if verbose:
                print('Ally is %d feet away' % ally_distance)
                print('Pack Tactics! %s has advantage' % self)
            
        # take action
        if distance > max_range:
            # dash action
            if verbose:
                print('%s dashes to %s' % (self, target))
            self.move(destination=target.position)
        else:
            # melee attack action
            self.melee_attack(target, advantage=advantage)

    def melee_attack(self, target, disadvantage=False, advantage=False):
        if verbose:
            print('%s attacks %s' % (self, target))
        
        # determine weapons
        if ';' in str(self.data['Melee']):
            attack_mod = int(self.data['Melee'].split(';')[0])
            damage_string = self.data['Melee Damage'].split(';')[0].lower()
        else:
            attack_mod = int(self.data['Melee'])
            damage_string = self.data['Melee Damage'].lower()
        
        # determine damage modification
        if '+' in damage_string:
            damage_dice, damage_mod = damage_string.split('+')
            damage_mod = int(damage_mod)
        elif '-' in damage_string:
            damage_dice, damage_mod = damage_string.split('-')
            damage_mod = -int(damage_mod)
        else:
            damage_dice = damage_string
            damage_mod = 0
        
        # determine damage dice
        if damage_dice[0] == 'd':
            n_damage_dice = 1
            damage_die = int(damage_dice[1:])
        else:
            n_damage_dice, damage_die = damage_dice.split('d')
            n_damage_dice = int(n_damage_dice)
            damage_die = int(damage_die)
        
        # roll for damage
        damage = damage_mod
        for n in range(n_damage_dice):
            roll = np.random.randint(damage_die) + 1
            damage += roll
        
        if target.resistant:
            if verbose:
                print('%s is resistant to your attack' % target)
            damage = np.round(damage/2)
        
        # roll attack
        if advantage:
            attack_roll = max(np.random.randint(0, 20, 2)) + 1 + attack_mod
        elif disadvantage:
            attack_roll = min(np.random.randint(0, 20, 2)) + 1 + attack_mod
        else:
            attack_roll = np.random.randint(20) + 1 + attack_mod

        # check target armor class
        if attack_roll >= target.data['Armor Class']:
            target.current_hp -= damage
            self.trip(target)
            if verbose:
                print('Attack roll: %d. Hit!' % attack_roll)
                print('Damage: %dd%d+%d: %d' % (n_damage_dice, damage_die, damage_mod, damage))
                print('%s has %d hit points left' % (target, target.current_hp))
        else:
            if verbose:
                print('Attack roll: %d. Miss!' % attack_roll)
            
    def trip(self, target):
        save = target.save(ability='Strength', dc=11)
        if not save:
            if verbose:
                print('%s trips %s' % (self, target))
            target.prone = True