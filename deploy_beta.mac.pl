#!/usr/bin/perl
#
# Deploy script for beta, assumes matching version in ../src/manifest.json
#
use JSON;
use File::Copy;

# Beta file name
$beta_file = 'dA_notifier_6_DEV.crx';
$deploy_dir = '/Users/Xan/Dropbox/Public/';

# Current source version
$version = read_manifest();

print "Do you want to build version $version (Y/n)? ";
$answer = <>; if($answer =~ m/^[nN]/) { die "Okay, aborting.\n";}
build_beta();
$mtime = localtime((stat "build/${beta_file}")[9]);

# Open old update_xml, replace version number, write output to build folder
open UPDATE_XML, $deploy_dir.'update_danb.xml' or die "Can't open deployed update XML file in ${deploy_dir}: $!\n";;
open REPLACE_XML, '>build/update_danb.xml';
while (<UPDATE_XML>){
	if (s/(<updatecheck.*version=')([0-9.]+)('.*>)/$1.$version.$3/e) { $old_version = $2; }
	print REPLACE_XML;
}
close UPDATE_XML;
close REPLACE_XML;

# Doublecheck!
print "\nCurrently deployed beta version: ${old_version}\n";

$newer = (compare_versions($version, $old_version) == 1);
unless($newer) { print "\nWARNING: Currently deployed version is same or newer.\nExtension will NOT auto-update!\n\n"; }

print "Are you sure you".($newer ? "" : " STILL")." want to deploy beta ${version} (y/N)? ";
unless(<> eq "y\n") { die "Not assertive enough. Abort.\n";}

# Backup current version
copy($deploy_dir.'update_danb.xml', 'build/bak') or die "Backup failure: $!\nDeployment aborted";
copy($deploy_dir.$beta_file, 'build/bak') or die "Backup failure: $!\nDeployment aborted";

# Replace deployed files, DELETING current build
move('build/update_danb.xml', $deploy_dir) or die "Deployment failure: $!\n";
move('build/'.$beta_file, $deploy_dir) or die "Deployment failure: $!\n";

print "Beta deployed successfully.\n";

##############

# Open current manifest file, extract current version number
sub read_manifest 
{
	my $version, $manifest, $manifest_json;
	open MANIFEST, 'src/manifest.json' or die "Can't open manifest file! $!\n";
		while(<MANIFEST>) { $manifest_json .= $_; }
		$manifest = decode_json($manifest_json);
		$version = $manifest->{version};
	close MANIFEST;
	
	return $version;	
}

# Build beta package from current source (needs .pem file outside project)
sub build_beta
{
	if (system("./crxmake.sh src ../dA_notifier_beta.pem")) { die "Build faiulre!\n"; }
	move("src.crx", "build/".$beta_file) or die "Build failure! $!\n";
	print "Built 'build/${beta_file}' successfully.\n";
}

# Compares 2 version strings a la <=> according to Chrome specs
sub compare_versions
{
	my($a, $b) = @_;
	
	my @a = split(/\./, $a);
	my @b = split(/\./, $b);
	
	foreach (1..4){
		my $cmp = (shift @a or 0) <=> (shift @b or 0);
		if($cmp) { return $cmp; }
	}
	
	return 0;
}