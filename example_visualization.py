#!/usr/bin/env python3
"""
F1 Fantasy Data Visualization Example

This example demonstrates how to fetch and visualize F1 Fantasy data directly from 
the GitHub repository using the raw data URLs. It shows various types of analysis
including cumulative points, race-by-race performance, and driver comparisons.

Requirements:
    pip install requests matplotlib pandas seaborn

Usage:
    python example_visualization.py
"""

import requests
import json
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from datetime import datetime

# Configuration
BASE_URL = "https://raw.githubusercontent.com/JoshCBruce/fantasy-data/refs/heads/main/latest"
DRIVER_DATA_URL = f"{BASE_URL}/driver_data"
SUMMARY_DATA_URL = f"{BASE_URL}/summary_data"

def fetch_driver_data(abbreviation):
    """Fetch individual driver data from GitHub raw URL"""
    url = f"{DRIVER_DATA_URL}/{abbreviation}.json"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching data for {abbreviation}: {e}")
        return None

def fetch_summary_data():
    """Fetch weekend summary data from GitHub raw URL"""
    url = f"{SUMMARY_DATA_URL}/weekend_summary.json"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching summary data: {e}")
        return None

def get_cumulative_points(driver_data):
    """Calculate cumulative points for a driver across all races"""
    races = driver_data.get('races', [])
    # Sort races by round number to ensure correct order
    races_sorted = sorted(races, key=lambda x: int(x['round']))
    
    race_names = []
    total_points = []
    cumulative = 0
    
    for race in races_sorted:
        race_names.append(f"R{race['round']}: {race['raceName']}")
        points = race['totalPoints']
        cumulative += points
        total_points.append(cumulative)
    
    return race_names, total_points

def plot_cumulative_points_comparison(drivers):
    """Plot cumulative points comparison for multiple drivers"""
    plt.figure(figsize=(15, 8))
    
    colors = ['#FF1E1E', '#FF8700', '#BF0A30', '#006F62', '#0090FF', '#DC143C']
    
    for i, (abbrev, name) in enumerate(drivers):
        driver_data = fetch_driver_data(abbrev)
        if driver_data:
            race_names, cumulative_points = get_cumulative_points(driver_data)
            rounds = [int(r.split(':')[0][1:]) for r in race_names]  # Extract round numbers
            plt.plot(rounds, cumulative_points, 
                    marker='o', linewidth=2, markersize=4, 
                    color=colors[i % len(colors)], label=f"{name} ({abbrev})")
    
    plt.title('F1 Fantasy Points - Cumulative Comparison', fontsize=16, fontweight='bold')
    plt.xlabel('Race Round', fontsize=12)
    plt.ylabel('Cumulative Points', fontsize=12)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    # Add some styling
    plt.gca().spines['top'].set_visible(False)
    plt.gca().spines['right'].set_visible(False)
    plt.show()

def plot_race_by_race_performance(driver_abbrev):
    """Plot race-by-race points breakdown for a single driver"""
    driver_data = fetch_driver_data(driver_abbrev)
    if not driver_data:
        return
    
    races = sorted(driver_data.get('races', []), key=lambda x: int(x['round']))
    
    race_numbers = [int(race['round']) for race in races]
    race_names = [race['raceName'] for race in races]
    total_points = [race['totalPoints'] for race in races]
    
    # Create race labels combining round and name
    race_labels = [f"R{num}\n{name[:8]}" for num, name in zip(race_numbers, race_names)]
    
    fig, ax = plt.subplots(figsize=(16, 8))
    
    # Color bars based on positive/negative points
    colors = ['#00C851' if p >= 0 else '#FF4444' for p in total_points]
    bars = ax.bar(race_labels, total_points, color=colors, alpha=0.8, edgecolor='black', linewidth=0.5)
    
    # Add value labels on bars
    for bar, points in zip(bars, total_points):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + (1 if height >= 0 else -3),
                f'{points}', ha='center', va='bottom' if height >= 0 else 'top', fontweight='bold')
    
    driver_name = driver_data.get('displayName', driver_abbrev)
    team = driver_data.get('team', 'Unknown')
    season_total = driver_data.get('seasonTotalPoints', 0)
    
    plt.title(f'{driver_name} ({driver_abbrev}) - {team}\nRace-by-Race Performance (Season Total: {season_total} pts)', 
              fontsize=14, fontweight='bold')
    plt.xlabel('Race', fontsize=12)
    plt.ylabel('Fantasy Points', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.axhline(y=0, color='black', linestyle='-', linewidth=0.8)
    plt.grid(True, alpha=0.3, axis='y')
    
    # Add some styling
    plt.gca().spines['top'].set_visible(False)
    plt.gca().spines['right'].set_visible(False)
    plt.tight_layout()
    plt.show()

def plot_weekend_summary_heatmap():
    """Create a heatmap of all drivers' performance across all races"""
    summary_data = fetch_summary_data()
    if not summary_data:
        return
    
    # Create DataFrame from summary data
    data_for_heatmap = []
    rounds = sorted(summary_data.keys(), key=int)
    
    # Get all unique drivers
    all_drivers = set()
    for round_data in summary_data.values():
        all_drivers.update(round_data.get('drivers', {}).keys())
    
    all_drivers = sorted(all_drivers)
    
    # Build matrix
    matrix_data = []
    for driver in all_drivers:
        driver_row = []
        for round_num in rounds:
            round_data = summary_data[round_num]
            points = round_data.get('drivers', {}).get(driver, 0)
            driver_row.append(points)
        matrix_data.append(driver_row)
    
    # Create DataFrame
    race_labels = [f"R{r}: {summary_data[r]['raceName'][:6]}" for r in rounds]
    df = pd.DataFrame(matrix_data, index=all_drivers, columns=race_labels)
    
    # Create heatmap
    plt.figure(figsize=(20, 12))
    
    # Custom colormap - red for negative, white for zero, green for positive
    sns.heatmap(df, center=0, cmap='RdYlGn', annot=True, fmt='d', 
                cbar_kws={'label': 'Fantasy Points'}, 
                linewidths=0.5, linecolor='white')
    
    plt.title('F1 Fantasy Points Heatmap - All Drivers Across All Races', 
              fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Race Weekend', fontsize=12)
    plt.ylabel('Driver', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.show()

def analyze_top_performers():
    """Analyze and display top performing drivers"""
    summary_data = fetch_summary_data()
    if not summary_data:
        return
    
    # Calculate total points for each driver
    driver_totals = {}
    for round_data in summary_data.values():
        for driver, points in round_data.get('drivers', {}).items():
            driver_totals[driver] = driver_totals.get(driver, 0) + points
    
    # Sort by total points
    top_drivers = sorted(driver_totals.items(), key=lambda x: x[1], reverse=True)[:10]
    
    print("\n🏆 TOP 10 FANTASY PERFORMERS (Season Total)")
    print("=" * 50)
    for i, (driver, total) in enumerate(top_drivers, 1):
        print(f"{i:2d}. {driver}: {total:4d} points")
    
    return top_drivers

def main():
    """Main function demonstrating various visualizations"""
    print("🏁 F1 Fantasy Data Visualization Examples")
    print("=" * 50)
    
    # Example 1: Single driver race-by-race performance
    print("\n📊 Example 1: Race-by-Race Performance")
    print("Showing Fernando Alonso's performance...")
    plot_race_by_race_performance('ALO')
    
    # Example 2: Top drivers comparison
    print("\n📈 Example 2: Top Drivers Cumulative Comparison")
    top_drivers = [
        ('NOR', 'Lando Norris'),
        ('PIA', 'Oscar Piastri'), 
        ('VER', 'Max Verstappen'),
        ('RUS', 'George Russell'),
        ('HAM', 'Lewis Hamilton'),
        ('LEC', 'Charles Leclerc')
    ]
    plot_cumulative_points_comparison(top_drivers)
    
    # Example 3: Weekend summary heatmap
    print("\n🔥 Example 3: Full Season Heatmap")
    print("Generating heatmap for all drivers...")
    plot_weekend_summary_heatmap()
    
    # Example 4: Top performers analysis
    print("\n🏆 Example 4: Season Analysis")
    analyze_top_performers()
    
    # Example 5: Fetch specific driver info
    print("\n📋 Example 5: Driver Information")
    alonso_data = fetch_driver_data('ALO')
    if alonso_data:
        print(f"Driver: {alonso_data['displayName']}")
        print(f"Team: {alonso_data['team']}")
        print(f"Season Points: {alonso_data['seasonTotalPoints']}")
        print(f"Percentage Picked: {alonso_data['percentagePicked']}%")
        print(f"Current Value: ${alonso_data['value']}")
        print(f"Championship Position: P{alonso_data['position']}")
        print(f"Total Races: {len(alonso_data['races'])}")

if __name__ == "__main__":
    main()