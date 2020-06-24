#Libraries
import RPi.GPIO as GPIO
import time
 
#GPIO Mode (BOARD / BCM)
GPIO.setmode(GPIO.BCM)
 
#set GPIO Pins
GPIO_TRIGGER = 18
GPIO_ECHO = 24
 
#set GPIO direction (IN / OUT)
GPIO.setup(GPIO_TRIGGER, GPIO.OUT)
GPIO.setup(GPIO_ECHO, GPIO.IN)
 
def distance():
    # set Trigger to HIGH
    GPIO.output(GPIO_TRIGGER, True)
 
    # set Trigger after 0.01ms to LOW
    time.sleep(0.00001)
    GPIO.output(GPIO_TRIGGER, False)
 
    StartTime = time.time()
    StopTime = time.time()
 
    # save StartTime
    while GPIO.input(GPIO_ECHO) == 0:
        StartTime = time.time()
        if StartTime - StopTime > 0.1:
            return 0
 
    # save time of arrival
    while GPIO.input(GPIO_ECHO) == 1:
        StopTime = time.time()
        if StopTime - StartTime > 0.1:
            return 0
 
    # time difference between start and arrival
    TimeElapsed = StopTime - StartTime
    # multiply with the sonic speed (34300 cm/s)
    # and divide by 2, because there and back
    distance = (TimeElapsed * 34300) / 2
 
    return distance

samples = [0,0,0,0,0,0,0,0,0]
def measure():
    i = 0
    while i < len(samples):
        samples[i] = distance()
        if samples[i] > 0:
            i += 1
        time.sleep(0.005)
    samples.sort
    return sum(samples[3:6]) / 3
 
if __name__ == '__main__':
    try:
        print("Starting")
        prev = 0.0
        while True:
            dist = measure()
            diff = abs(dist - prev)
            if abs(dist - prev) > 1:
                print ("%.1f" % dist)
                prev = dist
            time.sleep(0.2)
 
        # Reset by pressing CTRL + C
    except KeyboardInterrupt:
        print("Measurement stopped by User")
        GPIO.cleanup()