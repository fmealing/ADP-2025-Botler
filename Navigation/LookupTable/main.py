from navigation_controller import NavigationController

def main():
    controller = NavigationController()

    try:
        controller.run()
    except KeyboardInterrupt:
        print("\n[INFO] Keyboard interrupt received. Shutting down...")
    finally:
        controller.shutdown()


if __name__ == "__main__":
    main()
