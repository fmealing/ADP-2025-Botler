# motor_driver.py
import lgpio as GPIO


class MotorDriver:
    """
    Pi → ESP wheel command interface via 2 GPIO lines.

    Command mapping (right_pin, left_pin):
      STOP    -> (0, 0)
      FORWARD -> (1, 1)
      LEFT    -> (1, 0)  # right wheel enabled, left disabled
      RIGHT   -> (0, 1)  # left wheel enabled, right disabled
    """

    def __init__(self, gpio_handle, right_pin=12, left_pin=13, verbose=True):
        self.h = gpio_handle
        self.right_pin = right_pin
        self.left_pin = left_pin
        self.verbose = verbose
        self._last_cmd = None

        GPIO.gpio_claim_output(self.h, self.right_pin)
        GPIO.gpio_claim_output(self.h, self.left_pin)

        self.apply("STOP")

    def _write(self, right_state: int, left_state: int):
        GPIO.gpio_write(self.h, self.right_pin, int(right_state))
        GPIO.gpio_write(self.h, self.left_pin, int(left_state))

    def apply(self, cmd: str):
        cmd = (cmd or "STOP").upper().strip()

        if cmd == self._last_cmd:
            return
        self._last_cmd = cmd

        if self.verbose:
            print(f"[MOTOR] {cmd}")

        if cmd == "STOP":
            self._write(0, 0)
        elif cmd == "FORWARD":
            self._write(1, 1)
        elif cmd == "LEFT":
            self._write(1, 0)
        elif cmd == "RIGHT":
            self._write(0, 1)
        else:
            # Safety
            self._write(0, 0)
