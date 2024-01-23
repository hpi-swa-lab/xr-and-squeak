#!/usr/bin/env python3

import subprocess
import os
import sys
from collections import defaultdict, Counter


def run_git_command(command):
    """ Run a git command and return its output. """
    return subprocess.check_output(command, shell=True).decode('utf-8')

def is_valid_path(path):
    """ Check if a given path is a valid directory or file in the repository. """
    return os.path.exists(path)

def get_commit_data():
    """ Extract commit messages and changed directories. """
    commit_data = run_git_command("git log --pretty=format:'%s' --name-only")
    return commit_data.splitlines()

def get_staged_data():
    """ Extract paths of staged files and convert them to directories. """
    staged_data = run_git_command("git diff --name-only --cached")
    dirs = [os.path.dirname(line) for line in staged_data.splitlines() if is_valid_path(line)]
    return Counter(filter(None, dirs))

def process_commit_data(commit_data):
    """ Process commit data to associate prefixes with directories and count occurrences. """
    prefix_dirs = defaultdict(Counter)
    prefix_counts = Counter()
    current_prefix = ""
    for line in commit_data:
        if ':' in line and not line.startswith("Merge"):
            prefix, _ = line.split(':', 1)
            current_prefix = prefix.strip()
            prefix_counts[current_prefix] += 1
        elif current_prefix and is_valid_path(line.strip()):
            directory = os.path.dirname(line.strip())
            if directory:
                prefix_dirs[current_prefix].update([directory])
    return prefix_dirs, prefix_counts

def calculate_percentages(prefix_dirs):
    """ Calculate percentages of changes per directory for each prefix. """
    for prefix in prefix_dirs:
        total = sum(prefix_dirs[prefix].values())
        for dir in prefix_dirs[prefix]:
            prefix_dirs[prefix][dir] = round((prefix_dirs[prefix][dir] / total) * 100, 2)

def sort_data(prefix_dirs):
    """ Sort data for output. """
    sorted_output = {}
    for prefix in sorted(prefix_dirs.keys()):
        sorted_output[prefix] = sorted(prefix_dirs[prefix].items(), key=lambda x: x[1], reverse=True)
    return sorted_output

def output_results(sorted_output, prefix_counts):
    """ Output the results in the specified format. """
    for prefix, dirs in sorted_output.items():
        dirs_str = ', '.join([f"{dir} ({percent}%)" for dir, percent in dirs])
        print(f"{prefix} ({prefix_counts[prefix]} occurrences): {dirs_str}")

def recommend_prefix(prefix_dirs, folders, staged_counts=None):
    """ Recommend the most likely prefixes for given folders. """
    recommendations = defaultdict(list)
    for folder in folders:
        folder_path = os.path.dirname(folder) if os.path.isfile(folder) else folder.rstrip('/')
        for prefix, dirs in prefix_dirs.items():
            if folder_path in dirs:
                recommendations[folder_path].append((prefix, dirs[folder_path]))
        recommendations[folder_path].sort(key=lambda x: x[1], reverse=True)
    # scale up to 100%
    for folder in recommendations:
        total = sum([percent for _, percent in recommendations[folder]])
        for i, (prefix, percent) in enumerate(recommendations[folder]):
            recommendations[folder][i] = (prefix, round((percent / total) * 100, 2))
    return recommendations, staged_counts

def output_recommendations(recommendations, staged_counts=None):
    """ Output the recommendations. """
    for folder, recs in recommendations.items():
        recs_str = ', '.join([f"{prefix} ({percent}%)" for prefix, percent in recs])
        if staged_counts and folder in staged_counts:
            staged_count = staged_counts[folder]
            staged_count_str = f" ({staged_counts[folder]} {'change' if staged_count == 1 else 'changes'})"
        else:
            staged_count_str = ""
        print(f"{folder}{staged_count_str}: {recs_str}")

def print_help():
    """ Print help information. """
    script = os.path.basename(__file__)
    print("Usage:")
    print(f"  {script} --all                     # Display the full list of prefixes")
    print(f"  {script} --recommend [folders...]  # Recommend prefixes for given folders")
    print(f"  {script} --recommend-staged        # Recommend prefixes for staged changes")
    sys.exit(1)

def main(**kwargs):
    """ Main execution """
    commit_data = get_commit_data()
    prefix_dirs, prefix_counts = process_commit_data(commit_data)
    calculate_percentages(prefix_dirs)
    sorted_output = sort_data(prefix_dirs)

    if 'all' in kwargs and kwargs['all']:
        output_results(sorted_output, prefix_counts)
    elif 'recommend' in kwargs and kwargs['recommend']:
        folders = kwargs['recommend']
        recommendations, _ = recommend_prefix(prefix_dirs, folders)
        output_recommendations(recommendations)
    elif 'recommend_staged' in kwargs and kwargs['recommend_staged']:
        staged_dirs = get_staged_data()
        recommendations, staged_counts = recommend_prefix(prefix_dirs, staged_dirs.keys(), staged_dirs)
        output_recommendations(recommendations, staged_counts)
    else:
        print_help()


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        print_help()
    elif args[0] == '--all':
        main(all=True)
    elif args[0] == '--recommend':
        main(recommend=args[1:])
    elif args[0] == '--recommend-staged':
        main(recommend_staged=True)
    else:
        print_help()
