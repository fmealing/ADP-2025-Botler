# Imports
import sys
import time
import lgpio as GPIO
from tkinter import *
from tkinter import messagebox

import keyboard
# Initialise Tkinter
top = Tk()
top.geometry("300x300")

still = 1525 #pulsewidth to keep motors still

def q():
    GPIO.gpiochip_close(h)
    print("done")
    sys.exit(0)
    
def w():
    GPIO.tx_servo(h,ENR,500,50,0,50)
    GPIO.tx_servo(h,ENL,2500,50,0,50)
    
def a():
    GPIO.tx_servo(h,ENR,500,50,0,50)
    GPIO.tx_servo(h,ENL,still,50,0,50)
    
def s():
    GPIO.tx_servo(h,ENR,2500,50,0,50)
    GPIO.tx_servo(h,ENL,500,50,0,50)
        
def d():
    GPIO.tx_servo(h,ENR,still,50,0,50)
    GPIO.tx_servo(h,ENL,2500,50,0,50)

# GPIO setup
# buttons are ~35 width
W = Button(top, text="w", command=w)
W.place(x=50, y=0)
A = Button(top, text="a", command=a)
A.place(x=15, y=35)
S = Button(top, text="s", command=s)
S.place(x=50, y=35)
D = Button(top, text="d", command=d)
D.place(x=85, y=35)
Q = Button(top, text="q", command=q)
Q.place(x=75, y=75)


ENR = 12 #right motor
ENL = 13 #left motor

h = GPIO.gpiochip_open(4)
GPIO.gpio_claim_output(h,ENR)
GPIO.gpio_claim_output(h,ENL)

w()
w()
top.mainloop()