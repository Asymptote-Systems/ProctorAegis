import os
import subprocess
import time
import platform
import click
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.progress import track
from rich.panel import Panel

console = Console()

# ------------------- Config -------------------
DB_CONTAINER = "app-db"        # must match your Postgres container_name
DB_NAME = os.getenv("POSTGRES_DB", "app_db")
DB_USER = os.getenv("POSTGRES_USER", "app_user")

# ------------------- OS Detection -------------------
def is_wsl() -> bool:
    """Detect if running inside Windows Subsystem for Linux (WSL)."""
    if platform.system().lower() != "linux":
        return False
    try:
        with open("/proc/version", "r") as f:
            return "microsoft" in f.read().lower()
    except FileNotFoundError:
        return False

def is_cgroup_v2() -> bool:
    """Detect if Linux is using cgroup v2."""
    return os.path.exists("/sys/fs/cgroup/cgroup.controllers")

IS_WINDOWS = platform.system().lower().startswith("win")
IS_WSL = is_wsl()

if IS_WINDOWS or IS_WSL:
    IS_JUDGE0_SUPPORTED = False
else:
    if platform.system().lower() == "linux":
        if is_cgroup_v2():
            console.print("⚠️ [yellow]Detected cgroup v2: Judge0 cannot run on this system.[/yellow]")
            IS_JUDGE0_SUPPORTED = False
        else:
            IS_JUDGE0_SUPPORTED = True
    else:
        IS_JUDGE0_SUPPORTED = False


# ------------------- Utility -------------------
def run(cmd, capture=False):
    try:
        if capture:
            return subprocess.run(cmd, shell=True, text=True, capture_output=True, check=True)
        else:
            subprocess.run(cmd, shell=True, check=True)
    except subprocess.CalledProcessError:
        console.print(f"❌ [red]Command failed:[/red] {cmd}")
        if capture:
            return None

def setup_secrets():
    os.makedirs("secrets", exist_ok=True)
    if not os.path.exists("secrets/private.pem"):
        run("openssl genrsa -out secrets/private.pem 2048")
        console.print("🔑 [green]private.pem generated[/green]")
    if not os.path.exists("secrets/public.pem"):
        run("openssl rsa -in secrets/private.pem -pubout -out secrets/public.pem")
        console.print("🔑 [green]public.pem generated[/green]")

def show_urls():
    """Pretty dashboard of service URLs"""
    table = Table(title="🌐 Your Services Are Ready!", show_header=True, header_style="bold magenta")
    table.add_column("Service", style="cyan", justify="left")
    table.add_column("URL", style="green", justify="left")

    urls = [
        ("🗄️ Database Admin (Adminer)", "http://localhost:8080"),
        ("⚙️ Backend API HealthCheck", "http://localhost:8000"),
        ("🎨 Frontend (Vite React)", "http://localhost:5173"),
        ("📊 LogForge Dashboard", "http://localhost:3000"),
        ("🤖 Swagger API Dashboard(ADMIN)", "http://localhost:8000/docs#/"),
        ("🧑‍⚖️ Judge0 Code Runner", "http://localhost:2358" if IS_JUDGE0_SUPPORTED else "❌ Not available (Windows/WSL)"),
    ]

    for name, url in urls:
        table.add_row(name, url)

    console.print(table)
    console.print("💡 [yellow]Tip:[/yellow] Open these links in your browser to explore each service!")

# ------------------- Commands -------------------
@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """🚀 Manage your Docker Project (fun & easy!)"""
    if ctx.invoked_subcommand is None:
        show_menu()

@cli.command()
def start():
    """Start all services"""
    setup_secrets()
    console.print("🚀 [bold cyan]Starting services...[/bold cyan]")

    if not IS_JUDGE0_SUPPORTED:
        console.print("⚠️ [yellow]Judge0 is not supported on Windows or WSL! Skipping Judge0 service...[/yellow]")
        run("docker compose up -d db redis")
        for _ in track(range(10), description="⏳ Warming up DB & Redis..."):
            time.sleep(1)
        run("docker compose up -d backend adminer logforge-backend logforge-frontend logforge-notifier logforge-autoupdate frontend")
    else:
        run("docker compose up -d db redis judge0_db")
        for _ in track(range(10), description="⏳ Warming up DB & Redis..."):
            time.sleep(1)
        run("docker compose up -d")

    console.print("✅ [green]All services are up![/green]\n")
    show_urls()

@cli.command()
def stop():
    """Stop all services"""
    console.print("🛑 [red]Stopping services...[/red]")
    run("docker compose down")
    console.print("✅ [green]Services stopped[/green]")

@cli.command()
def restart():
    """Restart services"""
    console.print("🔄 [yellow]Restarting services...[/yellow]")
    run("docker compose restart")
    console.print("✅ [green]Services restarted[/green]")
    show_urls()

@cli.command("reset-db")
def reset_db():
    """Reset the database"""
    console.print("⚠️ [red]Resetting DB...[/red]")
    run("docker compose down -v")
    if not IS_JUDGE0_SUPPORTED:
        run("docker compose up -d --build db redis")
        for _ in track(range(10), description="⏳ Re-initializing DB & Redis..."):
            time.sleep(1)
        run("docker compose up -d --build frontend backend adminer logforge-backend logforge-frontend logforge-notifier logforge-autoupdate")
    else:
        run("docker compose up -d --build db redis judge0_db")
        for _ in track(range(10), description="⏳ Re-initializing DB & Redis..."):
            time.sleep(1)
        run("docker compose up -d --build")
    console.print("✅ [green]Database reset complete![/green]")
    show_urls()

@cli.command()
def status():
    """Show running containers"""
    console.print("📊 [cyan]Service Status:[/cyan]")
    result = run("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", capture=True)
    console.print(result.stdout if result else "No containers running")

@cli.command()
def update():
    """Update all Docker images"""
    console.print("⬇️ [cyan]Pulling latest images...[/cyan]")
    run("docker compose pull")
    console.print("✅ [green]Images updated![/green]")

@cli.command()
def clean():
    """Remove all containers, networks & volumes"""
    console.print("🧹 [red]Cleaning up everything...[/red]")
    run("docker compose down -v --remove-orphans")
    console.print("✅ [green]Project fully cleaned[/green]")

@cli.command()
def urls():
    """Show all service URLs"""
    show_urls()

@cli.command("factory-reset")
def factory_reset():
    """Full factory reset (⚠️ destroys everything and rebuilds from scratch)"""
    console.print("⚠️ [red]This will remove ALL containers, volumes, networks, and rebuild images from scratch![/red]")
    confirm = console.input("Type CONFIRM to continue: ")

    if confirm.strip() != "CONFIRM":
        console.print("❌ [red]Factory reset aborted.[/red]")
        return

    console.print("🧹 [yellow]Performing full cleanup...[/yellow]")
    run("docker compose down -v --remove-orphans")

    console.print("🔨 [cyan]Rebuilding everything with --no-cache...[/cyan]")

    if not IS_JUDGE0_SUPPORTED:
        # Windows/WSL path
        run("docker compose build --no-cache db redis")
        run("docker compose up -d db redis")
        for _ in track(range(10), description="⏳ Warming up DB & Redis..."):
            time.sleep(1)
        run("docker compose build --no-cache backend adminer logforge-backend logforge-frontend logforge-notifier logforge-autoupdate frontend")
        run("docker compose up -d backend adminer logforge-backend logforge-frontend logforge-notifier logforge-autoupdate frontend")
    else:
        # Linux path (Judge0 supported)
        run("docker compose build --no-cache db redis judge0_db")
        run("docker compose up -d db redis judge0_db")
        for _ in track(range(10), description="⏳ Warming up DB & Redis..."):
            time.sleep(1)
        run("docker compose build --no-cache")
        run("docker compose up -d")

    console.print("✅ [green]Factory reset complete! Everything rebuilt from scratch.[/green]")
    show_urls()


# ------------------- Backup & Restore -------------------
@cli.command("backup-db")
def backup_db():
    """Backup the database into a .sql file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    default_name = f"backup_{timestamp}.sql"
    filename = console.input(f"📂 Enter backup filename [default: {default_name}]: ") or default_name
    filepath = os.path.join(".", filename)

    console.print(f"💾 [cyan]Backing up database to {filepath}...[/cyan]")
    run(f"docker exec {DB_CONTAINER} pg_dump -U {DB_USER} {DB_NAME} > {filepath}")
    console.print(f"✅ [green]Backup complete! Saved as {filepath}[/green]")

@cli.command("restore-db")
def restore_db():
    """Restore the database from a .sql file"""
    filepath = console.input("📂 Enter path to backup file (.sql): ")
    if not os.path.exists(filepath):
        console.print("❌ [red]File not found![/red]")
        return

    console.print("⚠️ [red]This will erase the current DB and restore from backup![/red]")
    if not click.confirm("Do you want to continue?"):
        return

    console.print("🧹 [yellow]Dropping and recreating database...[/yellow]")
    run(f'docker exec -i {DB_CONTAINER} psql -U {DB_USER} -d postgres -c "DROP DATABASE IF EXISTS {DB_NAME};"')
    run(f'docker exec -i {DB_CONTAINER} psql -U {DB_USER} -d postgres -c "CREATE DATABASE {DB_NAME};"')

    console.print("♻️ [cyan]Restoring backup...[/cyan]")
    run(f"docker exec -i {DB_CONTAINER} psql -U {DB_USER} {DB_NAME} < {filepath}")
    console.print("✅ [green]Database restore complete![/green]")

# ------------------- Menu Mode -------------------
def show_menu():
    console.print(Panel.fit("💡 [bold cyan]Welcome to the Docker Manager[/bold cyan]\nEasy control panel for your services 🚀", border_style="cyan"))
    
    table = Table(title="Available Actions", show_header=True, header_style="bold magenta")
    table.add_column("Option", style="bold yellow")
    table.add_column("Command", style="cyan")
    table.add_column("Description", style="green")

    table.add_row("1", "start", "🚀 Start all services")
    table.add_row("2", "stop", "🛑 Stop all services")
    table.add_row("3", "restart", "🔄 Restart services")
    table.add_row("4", "reset-db", "⚠️ Reset the database")
    table.add_row("5", "status", "📊 Show running services")
    table.add_row("6", "update", "⬇️ Update Docker images")
    table.add_row("7", "clean", "🧹 Remove everything (reset project)")
    table.add_row("8", "urls", "🌐 Show all service URLs")
    table.add_row("9", "backup-db", "💾 Backup the database")
    table.add_row("10", "restore-db", "♻️ Restore the database")
    table.add_row("0", "exit", "👋 Exit the manager")
    table.add_row("-1", "factory-reset", "☠️ BUILD EVERYTHING FROM SCRATCH")

    console.print(table)

    choice = console.input("\n👉 [bold yellow]Enter your choice[/bold yellow]: ")

    mapping = {
        "1": start,
        "2": stop,
        "3": restart,
        "4": reset_db,
        "5": status,
        "6": update,
        "7": clean,
        "8": urls,
        "9": backup_db,
        "10": restore_db,
        "0": lambda: console.print("👋 [cyan]Goodbye![/cyan]"),
    }

    action = mapping.get(choice)
    if action:
        if choice == "0":
            return
        action()
    else:
        console.print("[red]❌ Invalid choice, try again![/red]")
    
    # Loop back
    show_menu()

# ------------------- Main -------------------
if __name__ == "__main__":
    cli()
